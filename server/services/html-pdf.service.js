// src/services/html-pdf.service.js

const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs').promises;
const { formatDate, formatCurrency } = require('../utils/string-formatter');

/**
 * @class HTMLPDFService
 * @description Service for generating PDF documents from HTML templates using Puppeteer
 * @since v3.0.0 (2025)
 * @author SheCares Development Team
 */
class HTMLPDFService {
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
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-gpu'
				]
			});
		}
		return this.browser;
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
	 * Prepare invoice data for template rendering
	 * @param {Object} invoiceData - Raw invoice data
	 * @returns {Object} Formatted invoice data
	 * @private
	 */
	_prepareInvoiceData(invoiceData) {
		// Calculate totals if not provided
		const items = invoiceData.items || invoiceData.order?.items || [];
		const subtotal = invoiceData.subtotal || items.reduce((sum, item) => {
			const price = item.unitPrice || item.price || 0;
			const quantity = item.quantity || 1;
			return sum + (price * quantity);
		}, 0);

		const tax = invoiceData.tax || 0;
		const deliveryFee = invoiceData.deliveryFee || 0;
		const discount = invoiceData.discount || 0;
		const totalAmount = invoiceData.totalAmount || (subtotal + tax + deliveryFee - discount);

		return {
			// Document details
			documentType: invoiceData.documentType || 'QUOTATION',
			invoiceNumber: invoiceData.invoiceNumber || `QUO-${Date.now()}`,
			orderId: invoiceData.orderId || invoiceData.id,
			issueDate: invoiceData.issueDate || invoiceData.createdAt || new Date(),
			dueDate: invoiceData.dueDate,
			status: invoiceData.status || 'pending',

			// Business information
			businessInfo: {
				name: 'She Cares Foodies',
				tagline: 'Plot H91 Ikota Shopping Complex',
				location: 'VGC - Lagos',
				address: 'Lagos, Nigeria',
				phone: '+2348023132369',
				email: 'globalsjxinfo@gmail.com',
				...invoiceData.businessInfo
			},

			// Client information
			clientInfo: {
				name: 'Lagos Leadership Conference',
				address: 'Lagos, Nigeria.',
				...invoiceData.clientInfo || invoiceData.client
			},

			// Items
			items: items.map(item => ({
				name: item.name || item.description,
				description: item.description,
				quantity: item.quantity || 1,
				unitPrice: item.unitPrice || item.price || 0,
				price: item.unitPrice || item.price || 0,
				totalPrice: (item.unitPrice || item.price || 0) * (item.quantity || 1)
			})),

			// Financial details
			subtotal,
			tax,
			deliveryFee,
			discount,
			totalAmount,
			amountInWords: this._numberToWords(totalAmount),

			// Payment details
			paymentDetails: {
				bankName: 'GTBANK',
				accountName: 'She Cares',
				accountNumber: '0112030068',
				...invoiceData.paymentDetails
			},

			// Additional details
			signature: {
				name: 'Nifemi Joseph',
				title: 'Oluwanifemi Joseph',
				...invoiceData.signature
			},
			footerNote: invoiceData.footerNote || 'Please note that value is due to change based on market conditions',

			// Utility functions for template
			formatDate: (date) => formatDate(date),
			formatCurrency: (amount) => formatCurrency(amount)
		};
	}

	/**
	 * Generate invoice PDF from HTML template
	 * @param {Object} invoiceData - Invoice data
	 * @returns {Promise<Buffer>} PDF buffer
	 */
	async generateInvoice(invoiceData) {
		try {
			const browser = await this._initBrowser();
			const page = await browser.newPage();

			// Prepare data for template
			const templateData = this._prepareInvoiceData(invoiceData);

			// Read and render EJS template
			const templatePath = path.join(this.templatePath, 'quotation.ejs');
			let template;

			try {
				template = await fs.readFile(templatePath, 'utf-8');
			} catch (error) {
				// Fallback to inline template if file doesn't exist
				template = await this._getInlineTemplate();
			}

			const html = ejs.render(template, templateData);

			// Set page content
			await page.setContent(html, {
				waitUntil: 'networkidle0'
			});

			// Generate PDF
			const pdfBuffer = await page.pdf({
				format: 'A4',
				margin: {
					top: '0.5in',
					right: '0.5in',
					bottom: '0.5in',
					left: '0.5in'
				},
				printBackground: true,
				preferCSSPageSize: true
			});

			await page.close();
			return pdfBuffer;

		} catch (error) {
			console.error('Error generating invoice PDF:', error);
			throw new Error(`Failed to generate invoice PDF: ${error.message}`);
		}
	}

	/**
	 * Generate quotation PDF (alias for generateInvoice)
	 * @param {Object} quotationData - Quotation data
	 * @returns {Promise<Buffer>} PDF buffer
	 */
	async generateQuotation(quotationData) {
		quotationData.documentType = 'QUOTATION';
		return this.generateInvoice(quotationData);
	}

	/**
	 * Generate delivery note PDF
	 * @param {Object} deliveryData - Delivery data
	 * @returns {Promise<Buffer>} PDF buffer
	 */
	async generateDeliveryNote(deliveryData) {
		deliveryData.documentType = 'DELIVERY NOTE';
		return this.generateInvoice(deliveryData);
	}

	/**
	 * Generate receipt PDF
	 * @param {Object} receiptData - Receipt data
	 * @returns {Promise<Buffer>} PDF buffer
	 */
	async generateReceipt(receiptData) {
		receiptData.documentType = 'RECEIPT';
		return this.generateInvoice(receiptData);
	}

	/**
	 * Get inline template (fallback)
	 * @returns {Promise<string>} HTML template string
	 * @private
	 */
	async _getInlineTemplate() {
		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= documentType %> - She Cares Foodies</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
        }

        .quotation-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        .header {
            background: linear-gradient(135deg, #FF8C00 0%, #FFA500 100%);
            color: white;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }

        .header::before {
            content: '';
            position: absolute;
            left: -20px;
            top: 0;
            width: 40px;
            height: 100%;
            background: #FF6600;
            transform: skewX(-10deg);
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .company-info h1 {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .company-info .tagline {
            font-size: 16px;
            opacity: 0.9;
            font-style: italic;
        }

        .company-address {
            text-align: right;
            font-size: 14px;
            line-height: 1.4;
        }

        .document-title {
            background: #FF8C00;
            color: white;
            padding: 20px;
            text-align: right;
            position: relative;
        }

        .document-title h2 {
            font-size: 48px;
            font-weight: bold;
            letter-spacing: 2px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .content {
            padding: 40px;
        }

        .client-section {
            margin-bottom: 40px;
        }

        .client-info {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .client-details h3 {
            font-size: 18px;
            color: #333;
            margin-bottom: 15px;
            font-weight: bold;
        }

        .client-details p {
            margin: 8px 0;
            font-size: 16px;
            color: #555;
            line-height: 1.5;
        }

        .date-info {
            text-align: right;
            font-size: 18px;
            color: #333;
        }

        .date-info strong {
            font-weight: bold;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 40px 0;
            font-size: 16px;
        }

        .items-table thead {
            background-color: #333;
            color: white;
        }

        .items-table th {
            padding: 15px 12px;
            text-align: left;
            font-weight: bold;
            font-size: 16px;
        }

        .items-table th:nth-child(2) { text-align: center; }
        .items-table th:nth-child(3) { text-align: center; }
        .items-table th:nth-child(4) { text-align: right; }

        .items-table tbody tr {
            border-bottom: 1px solid #ddd;
        }

        .items-table tbody tr:hover {
            background-color: #f9f9f9;
        }

        .items-table td {
            padding: 15px 12px;
            font-size: 16px;
            color: #333;
        }

        .items-table td:nth-child(2) { text-align: center; }
        .items-table td:nth-child(3) { text-align: center; }
        .items-table td:nth-child(4) { 
            text-align: right; 
            font-weight: bold;
        }

        .total-section {
            margin: 40px 0;
            text-align: right;
        }

        .total-row {
            display: flex;
            justify-content: flex-end;
            margin: 10px 0;
            font-size: 18px;
        }

        .total-row.grand-total {
            border-top: 3px solid #333;
            padding-top: 15px;
            margin-top: 20px;
            font-weight: bold;
            font-size: 24px;
            color: #FF8C00;
        }

        .total-label {
            width: 150px;
            text-align: left;
            margin-right: 20px;
        }

        .total-amount {
            width: 150px;
            text-align: right;
            font-weight: bold;
        }

        .payment-section {
            margin: 50px 0 30px 0;
        }

        .payment-section h3 {
            font-size: 20px;
            color: #333;
            margin-bottom: 20px;
            font-weight: bold;
        }

        .payment-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-left: 5px solid #FF8C00;
            font-size: 16px;
            line-height: 1.8;
        }

        .payment-details p {
            margin: 5px 0;
            color: #333;
        }

        .footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .thank-you {
            flex: 1;
        }

        .thank-you h3 {
            font-size: 24px;
            color: #333;
            margin-bottom: 10px;
            font-weight: bold;
        }

        .thank-you .note {
            font-style: italic;
            color: #666;
            font-size: 14px;
            line-height: 1.5;
        }

        .signature {
            text-align: right;
        }

        .signature-name {
            font-size: 18px;
            color: #333;
            margin-bottom: 5px;
            font-style: italic;
        }

        .signature-title {
            font-size: 16px;
            font-weight: bold;
            color: #333;
        }

        @media print {
            body {
                padding: 0;
                background: white;
            }
            
            .quotation-container {
                box-shadow: none;
                max-width: none;
            }
        }

        .currency {
            font-family: 'Times New Roman', serif;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="quotation-container">
        <div class="header">
            <div class="header-content">
                <div class="company-info">
                    <h1>She Cares Foodies</h1>
                    <div class="tagline"><%= businessInfo?.tagline || 'Plot H91 Ikota Shopping Complex' %></div>
                    <div class="tagline"><%= businessInfo?.location || 'VGC - Lagos' %></div>
                </div>
                <div class="company-address">
                    <div><%= businessInfo?.address || 'Lagos, Nigeria' %></div>
                    <div>Phone: <%= businessInfo?.phone || '+2348023132369' %></div>
                    <div>Email: <%= businessInfo?.email || 'globalsjxinfo@gmail.com' %></div>
                </div>
            </div>
        </div>

        <div class="document-title">
            <h2><%= documentType || 'QUOTATION' %></h2>
        </div>

        <div class="content">
            <div class="client-section">
                <div class="client-info">
                    <div class="client-details">
                        <h3>TO:</h3>
                        <p><strong><%= clientInfo?.name || 'Lagos Leadership Conference' %></strong></p>
                        <% if (clientInfo?.address) { %>
                            <p><%= typeof clientInfo.address === 'object' ? 
                                [clientInfo.address.street, clientInfo.address.city, clientInfo.address.state, clientInfo.address.country].filter(Boolean).join(', ') 
                                : clientInfo.address %></p>
                        <% } else { %>
                            <p>Lagos, Nigeria.</p>
                        <% } %>
                        <% if (clientInfo?.phone) { %>
                            <p>Phone: <%= clientInfo.phone %></p>
                        <% } %>
                        <% if (clientInfo?.email) { %>
                            <p>Email: <%= clientInfo.email %></p>
                        <% } %>
                    </div>
                    <div class="date-info">
                        <strong>Date: <%= new Date(issueDate || Date.now()).toLocaleDateString('en-GB', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        }) %></strong>
                    </div>
                </div>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th>ITEM DESCRIPTION</th>
                        <th>PRICE</th>
                        <th>QTY</th>
                        <th>TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    <% (items || []).forEach(item => { %>
                        <tr>
                            <td><%= item.name || item.description %></td>
                            <td><span class="currency">₦</span> <%= (item.unitPrice || item.price || 0).toLocaleString('en-NG', {minimumFractionDigits: 2}) %></td>
                            <td><%= item.quantity || 1 %></td>
                            <td><span class="currency">₦</span> <%= ((item.unitPrice || item.price || 0) * (item.quantity || 1)).toLocaleString('en-NG', {minimumFractionDigits: 2}) %></td>
                        </tr>
                    <% }); %>
                </tbody>
            </table>

            <div class="total-section">
                <% if (subtotal && subtotal !== totalAmount) { %>
                    <div class="total-row">
                        <div class="total-label">Subtotal:</div>
                        <div class="total-amount"><span class="currency">₦</span> <%= (subtotal || 0).toLocaleString('en-NG', {minimumFractionDigits: 2}) %></div>
                    </div>
                <% } %>
                
                <% if (tax && tax > 0) { %>
                    <div class="total-row">
                        <div class="total-label">Tax:</div>
                        <div class="total-amount"><span class="currency">₦</span> <%= tax.toLocaleString('en-NG', {minimumFractionDigits: 2}) %></div>
                    </div>
                <% } %>
                
                <% if (deliveryFee && deliveryFee > 0) { %>
                    <div class="total-row">
                        <div class="total-label">Delivery:</div>
                        <div class="total-amount"><span class="currency">₦</span> <%= deliveryFee.toLocaleString('en-NG', {minimumFractionDigits: 2}) %></div>
                    </div>
                <% } %>
                
                <% if (discount && discount > 0) { %>
                    <div class="total-row">
                        <div class="total-label">Discount:</div>
                        <div class="total-amount">-<span class="currency">₦</span> <%= discount.toLocaleString('en-NG', {minimumFractionDigits: 2}) %></div>
                    </div>
                <% } %>
                
                <div class="total-row grand-total">
                    <div class="total-label">Total</div>
                    <div class="total-amount"><span class="currency">₦</span> <%= (totalAmount || 0).toLocaleString('en-NG', {minimumFractionDigits: 2}) %></div>
                </div>
            </div>

            <div class="payment-section">
                <h3>Payment Method:</h3>
                <div class="payment-details">
                    <p><strong><%= paymentDetails?.bankName || 'GTBANK' %></strong></p>
                    <p><%= paymentDetails?.accountName || 'She Cares' %></p>
                    <p><%= paymentDetails?.accountNumber || '0112030068' %></p>
                </div>
            </div>

            <div class="footer">
                <div class="thank-you">
                    <h3>Thank you</h3>
                    <div class="note">
                        <%= footerNote || 'Please note that value is due to change based on market conditions' %>
                    </div>
                </div>
                <div class="signature">
                    <div class="signature-name"><%= signature?.name || 'Nifemi Joseph' %></div>
                    <div class="signature-title"><%= signature?.title || 'Oluwanifemi Joseph' %></div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
	}
}