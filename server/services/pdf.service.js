// src/services/pdf.service.js

const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/app.config');
const { formatDate, formatCurrency } = require('../utils/string-formatter');

/**
 * @class PDFService
 * @description Enhanced service for generating PDF documents from HTML templates
 * @since v2.0.0 (2025)
 * @author SheCares Development Team
 */
class PDFService {
	constructor() {
		this.templatePath = path.join(__dirname, '../templates');
		this.browser = null;
	}

	/**
	 * Initialize browser instance
	 * @private
	 */
	async _initBrowser() {
		if (!this.browser) {
			this.browser = await puppeteer.launch({
				headless: true,
				args: ['--no-sandbox', '--disable-setuid-sandbox']
			});
		}
		return this.browser;
	}

	/**
	 * Convert number to words (for amount in words)
	 * @param {number} amount - Amount to convert
	 * @returns {string} Amount in words
	 * @private
	 */
	_numberToWords(amount) {
		const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
		const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
		const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
		const thousands = ['', 'Thousand', 'Million', 'Billion'];

		if (amount === 0) return 'Zero Naira Only';

		const integerPart = Math.floor(amount);
		const decimalPart = Math.round((amount - integerPart) * 100);

		const convertHundreds = (num) => {
			let result = '';
			if (num > 99) {
				result += ones[Math.floor(num / 100)] + ' Hundred ';
				num %= 100;
			}
			if (num >= 20) {
				result += tens[Math.floor(num / 10)] + ' ';
				num %= 10;
			} else if (num >= 10) {
				result += teens[num - 10] + ' ';
				num = 0;
			}
			if (num > 0) {
				result += ones[num] + ' ';
			}
			return result;
		};

		let words = '';
		let scale = 0;
		let tempAmount = integerPart;

		while (tempAmount > 0) {
			const chunk = tempAmount % 1000;
			if (chunk !== 0) {
				words = convertHundreds(chunk) + thousands[scale] + ' ' + words;
			}
			tempAmount = Math.floor(tempAmount / 1000);
			scale++;
		}

		words += 'Naira';

		if (decimalPart > 0) {
			words += ' and ' + convertHundreds(decimalPart) + 'Kobo';
		}

		return words.trim() + ' Only';
	}

	/**
	 * Format address object or string into readable text
	 * @param {Object|string} address - Address object or string
	 * @returns {string} Formatted address string
	 * @private
	 */
	_formatAddress(address) {
		if (!address) return '';

		if (typeof address === 'string') {
			return address;
		}

		if (typeof address === 'object') {
			const parts = [];
			if (address.street) parts.push(address.street);
			if (address.city) parts.push(address.city);
			if (address.state) parts.push(address.state);
			if (address.postalCode) parts.push(address.postalCode);
			if (address.country) parts.push(address.country);

			return parts.join(', ');
		}

		return '';
	}

	/**
	 * Prepare invoice data for template
	 * @param {Object} invoiceData - Raw invoice data
	 * @returns {Object} Processed data for template
	 * @private
	 */
	_prepareTemplateData(invoiceData) {
		// Calculate totals if not provided
		let subtotal = invoiceData.subtotal || 0;
		if (!subtotal && invoiceData.items) {
			subtotal = invoiceData.items.reduce((sum, item) => {
				return sum + (item.totalPrice || (item.quantity * (item.unitPrice || item.price)));
			}, 0);
		}

		const tax = invoiceData.tax || 0;
		const deliveryFee = invoiceData.deliveryFee || 0;
		const discount = invoiceData.discount || 0;
		const totalAmount = invoiceData.totalAmount || (subtotal + tax + deliveryFee - discount);

		return {
			// Business Information
			businessInfo: {
				name: invoiceData.businessInfo?.name || 'She Cares Foodies',
				address: invoiceData.businessInfo?.address || 'Plot H91 Ikota Shopping Complex\nVGC - Lagos',
				phone: invoiceData.businessInfo?.phone || '+2348023132369',
				email: invoiceData.businessInfo?.email || 'globalsjxinfo@gmail.com',
				...invoiceData.businessInfo
			},

			// Document Information
			documentType: invoiceData.documentType || 'QUOTATION',
			invoiceNumber: invoiceData.invoiceNumber || 'QT-' + Date.now(),
			orderId: invoiceData.orderId || invoiceData.id,
			issueDate: formatDate(invoiceData.issueDate || invoiceData.createdAt || new Date()),
			dueDate: formatDate(invoiceData.dueDate),
			status: (invoiceData.status || 'pending').toUpperCase(),

			// Client Information
			clientInfo: {
				name: invoiceData.clientInfo?.name || invoiceData.client?.name || 'Lagos Leadership Conference',
				address: invoiceData.clientInfo?.address || 'Lagos, Nigeria',
				email: invoiceData.clientInfo?.email || invoiceData.client?.email || '',
				phone: invoiceData.clientInfo?.phone || invoiceData.client?.phone || '',
				...invoiceData.clientInfo,
				...invoiceData.client
			},

			// Items with processed data
			items: (invoiceData.items || invoiceData.order?.items || []).map((item, index) => ({
				serialNumber: index + 1,
				name: item.name || item.description || 'Item',
				quantity: item.quantity || 1,
				unitPrice: item.unitPrice || item.price || 0,
				totalPrice: item.totalPrice || (item.quantity * (item.unitPrice || item.price)) || 0,
				...item
			})),

			// Financial Information
			subtotal,
			tax,
			deliveryFee,
			discount,
			totalAmount,
			amountInWords: this._numberToWords(totalAmount),

			// Payment Information
			paymentDetails: {
				bankName: 'GTBANK',
				accountName: 'She Cares',
				accountNumber: '0112030068',
				...invoiceData.paymentDetails
			},
			signature: {
				name: invoiceData.signature?.name || "Folukemi Joseph",
				title: invoiceData.signature?.title || "Kemi Joseph",
			},
			// Additional Information
			notes: invoiceData.notes || 'Please note that value is due to change based on market conditions',
			authorizedBy: invoiceData.authorizedBy || 'Nifemi Joseph\nOluwanifemi Joseph',
			generatedDate: formatDate(new Date()),

			// Utility functions for template
			formatCurrency,
			formatDate
		};
	}

	/**
	 * Generate PDF from HTML template
	 * @param {string} templateName - Name of the EJS template file
	 * @param {Object} data - Data to pass to template
	 * @returns {Promise<Buffer>} PDF buffer
	 * @private
	 */
	async _generatePDFFromTemplate(templateName, data) {
		try {
			// Read and render EJS template
			const templateFile = path.join(this.templatePath, `${templateName}.ejs`);
			const template = await fs.readFile(templateFile, 'utf-8');
			const html = ejs.render(template, data);

			// Initialize browser
			const browser = await this._initBrowser();
			const page = await browser.newPage();

			// Set content and generate PDF
			await page.setContent(html, { waitUntil: 'networkidle0' });

			const pdf = await page.pdf({
				format: 'A4',
				margin: {
					top: '20px',
					bottom: '20px',
					left: '20px',
					right: '20px'
				},
				printBackground: true
			});

			await page.close();
			return pdf;

		} catch (error) {
			console.error('PDF Generation Error:', error);
			throw new Error(`Failed to generate PDF: ${error.message}`);
		}
	}

	/**
	 * Generate invoice PDF
	 * @param {Object} invoiceData - Invoice data with order and client details
	 * @returns {Promise<Buffer>} PDF buffer
	 */
	async generateInvoice(invoiceData) {
		const templateData = this._prepareTemplateData({
			...invoiceData,
			documentType: 'INVOICE'
		});
		return await this._generatePDFFromTemplate('quotation', templateData);
	}

	/**
	 * Generate quotation PDF
	 * @param {Object} quotationData - Quotation data
	 * @returns {Promise<Buffer>} PDF buffer
	 */
	async generateQuotation(quotationData) {
		const templateData = this._prepareTemplateData({
			...quotationData,
			documentType: 'QUOTATION'
		});
		return await this._generatePDFFromTemplate('quotation', templateData);
	}

	/**
	 * Generate delivery note PDF
	 * @param {Object} deliveryData - Delivery data
	 * @returns {Promise<Buffer>} PDF buffer
	 */
	async generateDeliveryNote(deliveryData) {
		const templateData = this._prepareTemplateData({
			...deliveryData,
			documentType: 'DELIVERY NOTE'
		});
		return await this._generatePDFFromTemplate('delivery-note', templateData);
	}

	/**
	 * Close browser instance
	 */
	async closeBrowser() {
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}
}

module.exports = new PDFService();