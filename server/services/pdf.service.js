// src/services/pdf.service.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const config = require('../config/app.config');
const { formatDate, formatCurrency } = require('../utils/string-formatter');
const { getTempFilePath } = require('../utils/file-helpers');

/**
 * @class PDFService
 * @description Service for generating PDF documents
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class PDFService {
	/**
	 * Generate invoice PDF
	 * @param {Object} invoiceData - Invoice data with order and client details
	 * @returns {Promise<Buffer>} PDF buffer
	 */
	async generateInvoice(invoiceData) {
		return new Promise((resolve, reject) => {
			try {
				// Create PDF document
				const doc = new PDFDocument({ margin: 50 });

				// Buffer to store PDF
				const buffers = [];
				doc.on('data', buffers.push.bind(buffers));
				doc.on('end', () => {
					const pdfBuffer = Buffer.concat(buffers);
					resolve(pdfBuffer);
				});

				// Add business information and branding
				this._addBusinessInfo(doc);

				// Add invoice header
				this._addInvoiceHeader(doc, invoiceData);

				// Add client information
				this._addClientInfo(doc, invoiceData.client);

				// Add invoice details
				this._addInvoiceDetails(doc, invoiceData);

				// Add order items table
				this._addOrderItemsTable(doc, invoiceData.order);

				// Add totals
				this._addTotals(doc, invoiceData);

				// Add payment information
				this._addPaymentInfo(doc);

				// Add footer
				this._addFooter(doc);

				// Finalize PDF
				doc.end();

			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Generate delivery note PDF
	 * @param {Object} deliveryData - Delivery data with order details
	 * @returns {Promise<Buffer>} PDF buffer
	 */
	async generateDeliveryNote(deliveryData) {
		return new Promise((resolve, reject) => {
			try {
				// Create PDF document
				const doc = new PDFDocument({ margin: 50 });

				// Buffer to store PDF
				const buffers = [];
				doc.on('data', buffers.push.bind(buffers));
				doc.on('end', () => {
					const pdfBuffer = Buffer.concat(buffers);
					resolve(pdfBuffer);
				});

				// Add business information and branding
				this._addBusinessInfo(doc);

				// Add delivery note header
				doc.fontSize(20).text('DELIVERY NOTE', { align: 'center' });
				doc.moveDown();

				// Add delivery information
				doc.fontSize(12).text(`Delivery ID: ${deliveryData.id}`);
				doc.text(`Date: ${formatDate(deliveryData.scheduledDate || new Date())}`);
				doc.text(`Status: ${deliveryData.status}`);
				doc.moveDown();

				// Add client information
				if (deliveryData.client) {
					this._addClientInfo(doc, deliveryData.client);
				}

				// Add delivery address
				doc.fontSize(14).text('Delivery Address:', { underline: true });
				const address = deliveryData.deliveryAddress;
				if (address) {
					doc.fontSize(12).text(`${address.street}`);
					doc.text(`${address.city}, ${address.state} ${address.postalCode}`);
					doc.text(`${address.country}`);
				}
				doc.moveDown();

				// Add order items table (simplified for delivery note)
				this._addDeliveryItemsTable(doc, deliveryData.order);

				// Add notes
				if (deliveryData.notes) {
					doc.moveDown();
					doc.fontSize(14).text('Notes:', { underline: true });
					doc.fontSize(12).text(deliveryData.notes);
				}

				// Add signature section
				doc.moveDown(2);
				doc.fontSize(12).text('Received in good condition:', { continued: true });
				doc.text('________________________', { align: 'right' });
				doc.fontSize(10).text('', { continued: true });
				doc.text('(Signature)', { align: 'right' });

				// Add footer
				this._addFooter(doc);

				// Finalize PDF
				doc.end();

			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Generate product catalog PDF
	 * @param {Array} products - Product list
	 * @param {Object} options - Generation options
	 * @returns {Promise<Buffer>} PDF buffer
	 */
	async generateCatalog(products, options = {}) {
		return new Promise((resolve, reject) => {
			try {
				// Create PDF document
				const doc = new PDFDocument({ margin: 50 });

				// Buffer to store PDF
				const buffers = [];
				doc.on('data', buffers.push.bind(buffers));
				doc.on('end', () => {
					const pdfBuffer = Buffer.concat(buffers);
					resolve(pdfBuffer);
				});

				// Add business information and branding
				this._addBusinessInfo(doc);

				// Add catalog header
				doc.fontSize(24).text('PRODUCT CATALOG', { align: 'center' });
				doc.fontSize(12).text(`Generated on ${formatDate(new Date())}`, { align: 'center' });
				doc.moveDown(2);

				// Group products by category if required
				if (options.groupByCategory && products.some(p => p.category)) {
					const categories = {};

					// Group products by category
					products.forEach(product => {
						const categoryName = product.category ? product.category.name : 'Uncategorized';
						if (!categories[categoryName]) {
							categories[categoryName] = [];
						}
						categories[categoryName].push(product);
					});

					// Add products by category
					let firstCategory = true;
					for (const [categoryName, categoryProducts] of Object.entries(categories)) {
						if (!firstCategory) {
							doc.moveDown(2);
							doc.addPage();
						}

						doc.fontSize(16).text(categoryName, { underline: true });
						doc.moveDown();

						this._addCatalogProducts(doc, categoryProducts);
						firstCategory = false;
					}
				} else {
					// Add all products without categorization
					this._addCatalogProducts(doc, products);
				}

				// Add footer
				this._addFooter(doc);

				// Finalize PDF
				doc.end();

			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Add business information to PDF
	 * @param {PDFDocument} doc - PDF document
	 * @private
	 */
	_addBusinessInfo(doc) {
		// Add logo if available
		const logoPath = path.resolve(__dirname, '../assets/logo.png');
		if (fs.existsSync(logoPath)) {
			doc.image(logoPath, 50, 45, { width: 150 });
			doc.moveDown(2);
		}

		// Add business details
		doc.fontSize(10)
			.text(config.businessName, { align: 'right' })
			.text(config.businessAddress.street, { align: 'right' })
			.text(`${config.businessAddress.city}, ${config.businessAddress.state} ${config.businessAddress.postalCode}`, { align: 'right' })
			.text(config.businessAddress.country, { align: 'right' })
			.text(`Phone: ${config.businessPhone}`, { align: 'right' })
			.text(`Email: ${config.businessEmail}`, { align: 'right' });

		doc.moveDown(2);
		doc.lineCap('butt')
			.moveTo(50, doc.y)
			.lineTo(550, doc.y)
			.stroke();
		doc.moveDown();
	}

	/**
	 * Add invoice header to PDF
	 * @param {PDFDocument} doc - PDF document
	 * @param {Object} invoiceData - Invoice data
	 * @private
	 */
	_addInvoiceHeader(doc, invoiceData) {
		doc.fontSize(20).text('INVOICE', { align: 'center' });
		doc.moveDown();

		doc.fontSize(12)
			.text(`Invoice Number: ${invoiceData.invoiceNumber}`, { align: 'right' })
			.text(`Order ID: ${invoiceData.orderId}`, { align: 'right' })
			.text(`Date: ${formatDate(invoiceData.createdAt)}`, { align: 'right' })
			.text(`Due Date: ${formatDate(invoiceData.dueDate || new Date(new Date(invoiceData.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000))}`, { align: 'right' })
			.text(`Status: ${invoiceData.status.toUpperCase()}`, { align: 'right' });

		doc.moveDown(2);
	}

	/**
	 * Add client information to PDF
	 * @param {PDFDocument} doc - PDF document
	 * @param {Object} client - Client data
	 * @private
	 */
	_addClientInfo(doc, client) {
		if (!client) return;

		doc.fontSize(14).text('Bill To:', { underline: true });
		doc.fontSize(12)
			.text(client.name)
			.text(client.email)
			.text(client.phone);

		if (client.address) {
			doc.text(client.address.street)
				.text(`${client.address.city}, ${client.address.state} ${client.address.postalCode}`)
				.text(client.address.country);
		}

		doc.moveDown(2);
	}

	/**
	 * Add invoice details to PDF
	 * @param {PDFDocument} doc - PDF document
	 * @param {Object} invoiceData - Invoice data
	 * @private
	 */
	_addInvoiceDetails(doc, invoiceData) {
		if (invoiceData.notes) {
			doc.fontSize(12).text('Invoice Notes:', { underline: true });
			doc.fontSize(10).text(invoiceData.notes);
			doc.moveDown();
		}
	}

	/**
	 * Add order items table to PDF
	 * @param {PDFDocument} doc - PDF document
	 * @param {Object} order - Order data
	 * @private
	 */
	_addOrderItemsTable(doc, order) {
		if (!order || !order.items || order.items.length === 0) return;

		// Define table layout
		const tableTop = doc.y + 10;
		const itemX = 50;
		const descriptionX = 90;
		const quantityX = 320;
		const priceX = 400;
		const amountX = 480;

		// Add table headers
		doc.fontSize(10)
			.text('Item', itemX, tableTop, { bold: true })
			.text('Description', descriptionX, tableTop, { bold: true })
			.text('Qty', quantityX, tableTop, { bold: true })
			.text('Price', priceX, tableTop, { bold: true })
			.text('Amount', amountX, tableTop, { bold: true });

		// Draw header underline
		doc.moveTo(itemX, tableTop + 15)
			.lineTo(amountX + 60, tableTop + 15)
			.stroke();

		// Add table rows
		let yPosition = tableTop + 25;
		order.items.forEach((item, index) => {
			// Check if we need a new page
			if (yPosition + 25 > doc.page.height - 100) {
				doc.addPage();
				yPosition = 50;

				// Add headers on new page
				doc.fontSize(10)
					.text('Item', itemX, yPosition, { bold: true })
					.text('Description', descriptionX, yPosition, { bold: true })
					.text('Qty', quantityX, yPosition, { bold: true })
					.text('Price', priceX, yPosition, { bold: true })
					.text('Amount', amountX, yPosition, { bold: true });

				// Draw header underline
				doc.moveTo(itemX, yPosition + 15)
					.lineTo(amountX + 60, yPosition + 15)
					.stroke();

				yPosition += 25;
			}

			// Add row data
			doc.fontSize(9)
				.text(index + 1, itemX, yPosition)
				.text(item.name, descriptionX, yPosition, { width: 220 })
				.text(item.quantity.toString(), quantityX, yPosition)
				.text(formatCurrency(item.price), priceX, yPosition)
				.text(formatCurrency(item.quantity * item.price), amountX, yPosition);

			yPosition += 20;
		});

		// Draw bottom line
		doc.moveTo(itemX, yPosition)
			.lineTo(amountX + 60, yPosition)
			.stroke();

		doc.y = yPosition + 10;
	}

	/**
	 * Add delivery items table to PDF
	 * @param {PDFDocument} doc - PDF document
	 * @param {Object} order - Order data
	 * @private
	 */
	_addDeliveryItemsTable(doc, order) {
		if (!order || !order.items || order.items.length === 0) return;

		// Define table layout
		const tableTop = doc.y + 10;
		const itemX = 50;
		const descriptionX = 90;
		const quantityX = 350;
		const checkboxX = 450;

		// Add table headers
		doc.fontSize(10)
			.text('Item', itemX, tableTop, { bold: true })
			.text('Description', descriptionX, tableTop, { bold: true })
			.text('Qty', quantityX, tableTop, { bold: true })
			.text('Received', checkboxX, tableTop, { bold: true });

		// Draw header underline
		doc.moveTo(itemX, tableTop + 15)
			.lineTo(checkboxX + 60, tableTop + 15)
			.stroke();

		// Add table rows
		let yPosition = tableTop + 25;
		order.items.forEach((item, index) => {
			// Check if we need a new page
			if (yPosition + 25 > doc.page.height - 100) {
				doc.addPage();
				yPosition = 50;

				// Add headers on new page
				doc.fontSize(10)
					.text('Item', itemX, yPosition, { bold: true })
					.text('Description', descriptionX, yPosition, { bold: true })
					.text('Qty', quantityX, yPosition, { bold: true })
					.text('Received', checkboxX, yPosition, { bold: true });

				// Draw header underline
				doc.moveTo(itemX, yPosition + 15)
					.lineTo(checkboxX + 60, yPosition + 15)
					.stroke();

				yPosition += 25;
			}

			// Add row data
			doc.fontSize(9)
				.text(index + 1, itemX, yPosition)
				.text(item.name, descriptionX, yPosition, { width: 250 })
				.text(item.quantity.toString(), quantityX, yPosition);

			// Add checkbox
			doc.rect(checkboxX, yPosition, 15, 15).stroke();

			yPosition += 20;
		});

		// Draw bottom line
		doc.moveTo(itemX, yPosition)
			.lineTo(checkboxX + 60, yPosition)
			.stroke();

		doc.y = yPosition + 10;
	}

	/**
	 * Add catalog products to PDF
	 * @param {PDFDocument} doc - PDF document
	 * @param {Array} products - Product list
	 * @private
	 */
	_addCatalogProducts(doc, products) {
		if (!products || products.length === 0) return;

		products.forEach((product, index) => {
			// Check if we need a new page
			if (doc.y > doc.page.height - 150 && index > 0) {
				doc.addPage();
			}

			// Product name and details
			doc.fontSize(14).text(product.name, { underline: true });
			doc.fontSize(10).text(`SKU: ${product.sku || 'N/A'}`);

			// Price information
			if (product.price) {
				doc.text(`Price: ${formatCurrency(product.price)} per ${product.unit || 'item'}`);
			}

			// Stock status
			const stockStatus = product.inStock ? 'In Stock' : 'Out of Stock';
			const stockQuantity = product.stockQuantity !== undefined ? ` (${product.stockQuantity} ${product.unit || 'units'} available)` : '';
			doc.text(`Status: ${stockStatus}${product.inStock ? stockQuantity : ''}`);

			// Description
			if (product.description) {
				doc.moveDown(0.5);
				doc.text(product.description, { width: 500 });
			}

			// Add spacing between products
			doc.moveDown(2);
		});
	}

	/**
	 * Add invoice totals to PDF
	 * @param {PDFDocument} doc - PDF document
	 * @param {Object} invoiceData - Invoice data
	 * @private
	 */
	_addTotals(doc, invoiceData) {
		if (!invoiceData.order) return;

		const order = invoiceData.order;
		const subtotal = order.subtotal || this._calculateSubtotal(order.items);
		const tax = order.tax || 0;
		const deliveryFee = order.deliveryFee || 0;
		const discount = order.discount || 0;
		const total = order.totalAmount || (subtotal + tax + deliveryFee - discount);

		const tableX = 350;
		const amountX = 480;
		let yPosition = doc.y + 10;

		// Subtotal
		doc.fontSize(10)
			.text('Subtotal:', tableX, yPosition)
			.text(formatCurrency(subtotal), amountX, yPosition);
		yPosition += 15;

		// Tax if applicable
		if (tax > 0) {
			doc.text('Tax:', tableX, yPosition)
				.text(formatCurrency(tax), amountX, yPosition);
			yPosition += 15;
		}

		// Delivery fee if applicable
		if (deliveryFee > 0) {
			doc.text('Delivery Fee:', tableX, yPosition)
				.text(formatCurrency(deliveryFee), amountX, yPosition);
			yPosition += 15;
		}

		// Discount if applicable
		if (discount > 0) {
			doc.text('Discount:', tableX, yPosition)
				.text(`-${formatCurrency(discount)}`, amountX, yPosition);
			yPosition += 15;
		}

		// Total
		doc.fontSize(12).font('Helvetica-Bold')
			.text('Total:', tableX, yPosition)
			.text(formatCurrency(total), amountX, yPosition);

		// Paid amount and balance if applicable
		if (invoiceData.status === 'partially_paid' || invoiceData.status === 'paid') {
			yPosition += 20;
			const paidAmount = invoiceData.paidAmount || 0;
			const balance = total - paidAmount;

			doc.fontSize(10).font('Helvetica')
				.text('Paid Amount:', tableX, yPosition)
				.text(formatCurrency(paidAmount), amountX, yPosition);

			yPosition += 15;
			doc.fontSize(12).font('Helvetica-Bold')
				.text('Balance Due:', tableX, yPosition)
				.text(formatCurrency(balance), amountX, yPosition);
		}

		doc.font('Helvetica');
		doc.y = yPosition + 30;
	}

	/**
	 * Add payment information to PDF
	 * @param {PDFDocument} doc - PDF document
	 * @private
	 */
	_addPaymentInfo(doc) {
		doc.fontSize(12).text('Payment Information', { underline: true });
		doc.fontSize(10)
			.text(`Bank Name: ${config.paymentInfo.bankName}`)
			.text(`Account Name: ${config.paymentInfo.accountName}`)
			.text(`Account Number: ${config.paymentInfo.accountNumber}`)
			.text(`Bank Code: ${config.paymentInfo.bankCode || 'N/A'}`);

		if (config.paymentInfo.additionalInfo) {
			doc.moveDown(0.5).text(config.paymentInfo.additionalInfo);
		}

		doc.moveDown();
	}

	/**
	 * Add footer to PDF
	 * @param {PDFDocument} doc - PDF document
	 * @private
	 */
	_addFooter(doc) {
		// Move to bottom of page
		doc.fontSize(8)
			.text(
				`This document was generated electronically by ${config.businessName} on ${formatDate(new Date())}. ` +
				'Thank you for your business!',
				50,
				doc.page.height - 50,
				{ align: 'center', width: 500 }
			);
	}

	/**
	 * Calculate subtotal from order items
	 * @param {Array} items - Order items
	 * @returns {number} Subtotal
	 * @private
	 */
	_calculateSubtotal(items) {
		if (!items || items.length === 0) return 0;
		return items.reduce((total, item) => total + (item.price * item.quantity), 0);
	}
}

module.exports = new PDFService();