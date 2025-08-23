// services/invoice.service.js - Complete Invoice Service
// ================================
const Invoice = require('../data/schemas/invoice.schema');
const Client = require('../data/schemas/client.schema');
const Product = require('../data/schemas/product.schema');
const PDFService = require('./pdf.service');
const EmailService = require('./email.service');
const htmlPDFService = require('./html-pdf.service');

class InvoiceService {
	// Updated createInvoice method for InvoiceService
	// Updated createInvoice method for InvoiceService
	async createInvoice(invoiceData) {
		try {
			// Handle client information - prioritize individual fields over clientInfo object
			let clientInfo;

			if (invoiceData.clientId) {
				// If clientId is provided, fetch from database
				const client = await Client.findById(invoiceData.clientId);
				if (client) {
					clientInfo = {
						name: client.name || client.fullName,
						email: client.email,
						phone: client.phone,
						address: client.address
					};
				}
			}

			// If no clientId or client not found, use individual fields or clientInfo object
			if (!clientInfo) {
				if (invoiceData.clientName || invoiceData.clientEmail || invoiceData.clientPhone || invoiceData.clientAddress) {
					// Use individual client fields from frontend
					clientInfo = {
						name: invoiceData.clientName,
						email: invoiceData.clientEmail || '',
						phone: invoiceData.clientPhone || '',
						address: invoiceData.clientAddress || ''
					};
				} else if (invoiceData.clientInfo) {
					// Use clientInfo object (backward compatibility)
					clientInfo = invoiceData.clientInfo;
				} else {
					throw new Error('Client information is required');
				}
			}

			// Generate invoice number if not provided
			const invoiceNumber = invoiceData.invoiceNumber || await this.generateInvoiceNumber();

			// Process items - remove frontend-only fields
			const processedItems = invoiceData.items.map(item => ({
				productId: item.productId || undefined, // Convert empty string to undefined
				name: item.name,
				quantity: parseFloat(item.quantity),
				unit: item.unit || 'piece',
				unitPrice: parseFloat(item.unitPrice),
				totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice)
			}));

			// Calculate totals (use frontend values if provided, otherwise calculate)
			const subtotal = invoiceData.subtotal || processedItems.reduce((sum, item) => sum + item.totalPrice, 0);
			const tax = parseFloat(invoiceData.tax) || 0;
			const discount = parseFloat(invoiceData.discount) || 0;
			const deliveryFee = parseFloat(invoiceData.deliveryFee) || 0;
			const totalAmount = invoiceData.totalAmount || (subtotal + tax + deliveryFee - discount);

			// Set default due date if not provided
			const dueDate = invoiceData.dueDate ? new Date(invoiceData.dueDate) : this.getDefaultDueDate();
			const issueDate = invoiceData.issueDate ? new Date(invoiceData.issueDate) : new Date();

			// Create invoice document
			const invoice = new Invoice({
				invoiceNumber,
				type: invoiceData.orderId ? 'order_based' : 'standalone',
				orderId: invoiceData.orderId || null, // Convert null to undefined
				clientId: invoiceData.clientId || undefined,
				clientInfo,
				businessInfo: this.getBusinessInfo(invoiceData.businessInfo),
				items: processedItems,
				subtotal,
				tax,
				discount,
				deliveryFee,
				totalAmount,
				issueDate,
				dueDate,
				paymentTerms: invoiceData.paymentTerms || 'Payment due within 7 days',
				paymentDetails: invoiceData.paymentDetails || this.getDefaultPaymentDetails(),
				notes: invoiceData.notes || '',
				status: invoiceData.status || 'pending'
			});

			await invoice.save();
			return invoice;
		} catch (error) {
			throw new Error(`Failed to create invoice: ${error.message}`);
		}
	}

	async getAllInvoices(options = {}) {
		try {
			const { page = 1, limit = 10, status, clientId, fromDate, toDate, sort = '-createdAt' } = options;
			const skip = (page - 1) * limit;

			// Build query
			const query = {};
			if (status) query.status = status;
			if (clientId) query.clientId = clientId;
			if (fromDate || toDate) {
				query.createdAt = {};
				if (fromDate) query.createdAt.$gte = new Date(fromDate);
				if (toDate) query.createdAt.$lte = new Date(toDate);
			}

			const invoices = await Invoice.find(query)
				.populate('clientId', 'name email phone')
				.sort(sort)
				.skip(skip)
				.limit(parseInt(limit));

			const total = await Invoice.countDocuments(query);

			return {
				invoices,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total,
					pages: Math.ceil(total / limit)
				}
			};
		} catch (error) {
			throw new Error(`Failed to fetch invoices: ${error.message}`);
		}
	}

	async getInvoiceByOrderId(orderId) {
		try {
			const invoice = await Invoice.findOne({ orderId })
				.populate('clientId', 'name email phone address');

			if (!invoice) {
				throw new Error('Invoice not found for this order');
			}

			return invoice;
		} catch (error) {
			throw new Error(`Failed to fetch invoice by order ID: ${error.message}`);
		}
	}

	async updateInvoice(invoiceId, updateData) {
		try {
			const invoice = await Invoice.findById(invoiceId);
			if (!invoice) {
				throw new Error('Invoice not found');
			}

			// Prevent updating certain fields
			delete updateData.invoiceNumber;
			delete updateData.orderId;

			// Recalculate totals if items are updated
			if (updateData.items) {
				const processedItems = await this.processInvoiceItems(updateData.items);
				const calculations = this.calculateTotals(processedItems, updateData);
				updateData.items = processedItems;
				Object.assign(updateData, calculations);
			}

			// Update invoice
			Object.assign(invoice, updateData);
			invoice.updatedAt = new Date();

			await invoice.save();
			return invoice;
		} catch (error) {
			throw new Error(`Failed to update invoice: ${error.message}`);
		}
	}

	async updateInvoiceStatus(invoiceId, status) {
		try {
			const invoice = await Invoice.findById(invoiceId);
			if (!invoice) {
				throw new Error('Invoice not found');
			}

			invoice.status = status;
			invoice.updatedAt = new Date();

			await invoice.save();
			return invoice;
		} catch (error) {
			throw new Error(`Failed to update invoice status: ${error.message}`);
		}
	}

	async deleteInvoice(invoiceId) {
		try {
			const invoice = await Invoice.findById(invoiceId);
			if (!invoice) {
				throw new Error('Invoice not found');
			}

			if (invoice.status === 'paid') {
				throw new Error('Paid invoices cannot be deleted');
			}

			await Invoice.findByIdAndDelete(invoiceId);
			return { success: true };
		} catch (error) {
			throw new Error(`Failed to delete invoice: ${error.message}`);
		}
	}

	async generateInvoicePDF(invoiceId) {
		try {
			const invoice = await this.getInvoiceById(invoiceId);
			return await PDFService.generateInvoice(invoice);
		} catch (error) {
			throw new Error(`Failed to generate PDF: ${error.message}`);
		}
	}

	/**
	 * Download invoice as PDF
	 * @param {string} invoiceId - The invoice ID
	 * @param {Object} options - Download options
	 * @returns {Object} - PDF buffer and filename for download
	 */
	/**
	 * Enhanced download invoice with proper data formatting
	 * @param {string} invoiceId - Invoice ID
	 * @param {Object} options - Download options
	 * @returns {Promise<Object>} PDF buffer and metadata
	 */
	async downloadInvoice(invoiceId, options = {}) {
		try {
			// Get invoice data with populated references
			const invoice = await Invoice.findById(invoiceId)
				.populate('clientId', 'name email phone address')
				.populate('orderId')
				.populate('items.productId', 'name sku')
				.lean();

			if (!invoice) {
				throw new Error('Invoice not found');
			}

			// Format invoice data for PDF generation
			// const formattedInvoice = this._formatInvoiceForPDF(invoice);

			// Generate PDF buffer
			const pdfBuffer = await PDFService.generateInvoice(invoice);

			// Generate filename
			const filename = options.filename || `Invoice-${invoice.invoiceNumber}.pdf`;

			// Update download tracking (optional)
			await this.updateDownloadTracking(invoiceId);

			return {
				buffer: pdfBuffer,
				filename: filename,
				contentType: 'application/pdf',
				size: pdfBuffer.length,
				invoiceNumber: invoice.invoiceNumber,
				clientName: invoice.clientInfo?.name || invoice.clientId?.name,
				totalAmount: invoice.totalAmount
			};
		} catch (error) {
			throw new Error(`Failed to download invoice: ${error.message}`);
		}
	}

	/**
	 * Format invoice data for PDF generation
	 * @param {Object} invoice - Raw invoice data
	 * @returns {Object} Formatted invoice data
	 * @private
	 */
	_formatInvoiceForPDF(invoice) {
		// Ensure all required fields are present with defaults
		const formattedInvoice = {
			// Basic invoice info
			invoiceNumber: invoice.invoiceNumber,
			orderId: invoice.orderId?._id || invoice.orderId,
			id: invoice._id,

			// Dates
			issueDate: invoice.issueDate || invoice.createdAt,
			dueDate: invoice.dueDate || this._calculateDueDate(invoice.issueDate || invoice.createdAt),
			createdAt: invoice.createdAt,

			// Status
			status: invoice.status || 'pending',

			// Client information (prioritize clientInfo over populated clientId)
			clientInfo: {
				name: invoice.clientInfo?.name || invoice.clientId?.name || 'N/A',
				email: invoice.clientInfo?.email || invoice.clientId?.email || '',
				phone: invoice.clientInfo?.phone || invoice.clientId?.phone || '',
				address: invoice.clientInfo?.address || invoice.clientId?.address || ''
			},

			// Business information
			businessInfo: invoice.businessInfo || {
				name: 'She Cares',
				address: 'H91, Ikota Shopping Complex, VGC\nLagos, Nigeria',
				email: 'globalsjxinfo@gmail.com',
				phone: '+2348023132369'
			},

			// Items - ensure proper formatting
			items: this._formatItems(invoice.items),

			// Financial totals
			subtotal: invoice.subtotal || 0,
			tax: invoice.tax || 0,
			discount: invoice.discount || 0,
			deliveryFee: invoice.deliveryFee || 0,
			totalAmount: invoice.totalAmount || 0,
			paidAmount: invoice.paidAmount || 0,

			// Payment details
			paymentDetails: invoice.paymentDetails || {
				bankName: 'First Bank',
				accountName: 'SheCares Foods',
				accountNumber: '0123456789',
				bankCode: '000000'
			},

			// Terms and notes
			paymentTerms: invoice.paymentTerms || 'Payment due within 7 days',
			notes: invoice.notes || ''
		};

		return formattedInvoice;
	}

	/**
	 * Format items for PDF display
	 * @param {Array} items - Raw items array
	 * @returns {Array} Formatted items
	 * @private
	 */
	_formatItems(items) {
		if (!items || !Array.isArray(items)) {
			return [];
		}

		return items.map(item => ({
			name: item.name || item.productId?.name || 'Unknown Product',
			quantity: item.quantity || 0,
			unit: item.unit || 'piece',
			unitPrice: item.unitPrice || item.price || 0,
			totalPrice: item.totalPrice || (item.quantity * (item.unitPrice || item.price)) || 0,
			sku: item.productId?.sku || item.sku || ''
		}));
	}

	/**
	 * Calculate due date (default 7 days from issue date)
	 * @param {Date} issueDate - Issue date
	 * @returns {Date} Due date
	 * @private
	 */
	_calculateDueDate(issueDate) {
		const date = new Date(issueDate);
		date.setDate(date.getDate() + 7);
		return date;
	}

	/**
	 * Get invoice by ID with proper population
	 * @param {string} invoiceId - Invoice ID
	 * @returns {Promise<Object>} Invoice data
	 */
	async getInvoiceById(invoiceId) {
		const invoice = await Invoice.findById(invoiceId)
			.populate('clientId')
			.populate('orderId')
			.populate('items.productId')
			.lean();

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		return this._formatInvoiceForPDF(invoice);
	}


	/**
	 * Download multiple invoices as a ZIP file
	 * @param {Array} invoiceIds - Array of invoice IDs
	 * @param {Object} options - Download options
	 * @returns {Object} - ZIP buffer and filename for download
	 */
	async downloadMultipleInvoices(invoiceIds, options = {}) {
		try {
			const JSZip = require('jszip');
			const zip = new JSZip();

			// Validate input
			if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
				throw new Error('Invoice IDs array is required');
			}

			// Generate PDFs for each invoice
			const invoicePromises = invoiceIds.map(async (invoiceId) => {
				try {
					const invoice = await this.getInvoiceById(invoiceId);
					const pdfBuffer = await PDFService.generateInvoice(invoice);
					return {
						filename: `Invoice-${invoice.invoiceNumber}.pdf`,
						buffer: pdfBuffer,
						invoiceNumber: invoice.invoiceNumber
					};
				} catch (error) {
					console.error(`Failed to generate PDF for invoice ${invoiceId}:`, error);
					return null;
				}
			});

			const invoiceResults = await Promise.all(invoicePromises);
			const validInvoices = invoiceResults.filter(result => result !== null);

			if (validInvoices.length === 0) {
				throw new Error('No valid invoices found to download');
			}

			// Add each PDF to the ZIP
			validInvoices.forEach(({ filename, buffer }) => {
				zip.file(filename, buffer);
			});

			// Generate ZIP buffer
			const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

			// Generate ZIP filename
			const timestamp = new Date().toISOString().split('T')[0];
			const zipFilename = options.filename || `Invoices-${timestamp}.zip`;

			return {
				buffer: zipBuffer,
				filename: zipFilename,
				contentType: 'application/zip',
				size: zipBuffer.length,
				invoiceCount: validInvoices.length,
				invoiceNumbers: validInvoices.map(inv => inv.invoiceNumber)
			};
		} catch (error) {
			throw new Error(`Failed to download multiple invoices: ${error.message}`);
		}
	}

	/**
	 * Get download history for an invoice
	 * @param {string} invoiceId - The invoice ID
	 * @returns {Object} - Download history
	 */
	async getDownloadHistory(invoiceId) {
		try {
			const invoice = await Invoice.findById(invoiceId).select('downloadHistory lastDownloadedAt downloadCount');

			if (!invoice) {
				throw new Error('Invoice not found');
			}

			return {
				downloadCount: invoice.downloadCount || 0,
				lastDownloadedAt: invoice.lastDownloadedAt || null,
				downloadHistory: invoice.downloadHistory || []
			};
		} catch (error) {
			throw new Error(`Failed to get download history: ${error.message}`);
		}
	}

	/**
	 * Update download tracking for an invoice
	 * @param {string} invoiceId - The invoice ID
	 * @param {Object} downloadInfo - Additional download information
	 */
	async updateDownloadTracking(invoiceId, downloadInfo = {}) {
		try {
			const invoice = await Invoice.findById(invoiceId);

			if (!invoice) {
				throw new Error('Invoice not found');
			}

			// Initialize download tracking fields if they don't exist
			if (!invoice.downloadCount) invoice.downloadCount = 0;
			if (!invoice.downloadHistory) invoice.downloadHistory = [];

			// Update download count and timestamp
			invoice.downloadCount += 1;
			invoice.lastDownloadedAt = new Date();

			// Add to download history (keep last 10 downloads)
			const downloadRecord = {
				downloadedAt: new Date(),
				userAgent: downloadInfo.userAgent || 'Unknown',
				ipAddress: downloadInfo.ipAddress || 'Unknown',
				downloadType: downloadInfo.downloadType || 'single'
			};

			invoice.downloadHistory.push(downloadRecord);

			// Keep only last 10 download records
			if (invoice.downloadHistory.length > 10) {
				invoice.downloadHistory = invoice.downloadHistory.slice(-10);
			}

			await invoice.save();
		} catch (error) {
			console.error('Failed to update download tracking:', error);
			// Don't throw error as this is not critical
		}
	}

	async sendInvoiceByEmail(invoiceId, options = {}) {
		try {
			const invoice = await this.getInvoiceById(invoiceId);

			if (!invoice.clientInfo.email) {
				throw new Error('Client email not found');
			}

			const pdfBuffer = await this.generateInvoicePDF(invoiceId);

			const emailData = {
				to: options.recipientEmail || invoice.clientInfo.email,
				subject: options.subject || `Invoice #${invoice.invoiceNumber}`,
				html: options.message || this.generateEmailTemplate(invoice),
				attachments: [{
					filename: `Invoice-${invoice.invoiceNumber}.pdf`,
					content: pdfBuffer
				}]
			};

			await EmailService.sendEmail(emailData);

			// Update last sent date
			invoice.lastSentAt = new Date();
			await invoice.save();

			return { success: true };
		} catch (error) {
			throw new Error(`Failed to send invoice: ${error.message}`);
		}
	}

	async recordPayment(invoiceId, paymentData) {
		try {
			const invoice = await Invoice.findById(invoiceId);
			if (!invoice) {
				throw new Error('Invoice not found');
			}

			const paymentAmount = parseFloat(paymentData.amount);
			if (isNaN(paymentAmount) || paymentAmount <= 0) {
				throw new Error('Invalid payment amount');
			}

			// Check if payment would exceed invoice total
			const newPaidAmount = invoice.paidAmount + paymentAmount;
			if (newPaidAmount > invoice.totalAmount) {
				throw new Error('Payment amount exceeds invoice balance');
			}

			// Add payment record
			const payment = {
				id: `payment_${Date.now()}`,
				amount: paymentAmount,
				method: paymentData.method || 'other',
				reference: paymentData.reference || '',
				date: paymentData.date || new Date(),
				notes: paymentData.notes || ''
			};

			invoice.payments.push(payment);
			invoice.paidAmount += paymentAmount;

			await invoice.save();
			return invoice;
		} catch (error) {
			throw new Error(`Failed to record payment: ${error.message}`);
		}
	}

	async getInvoicesByClient(clientId, options = {}) {
		try {
			const { page = 1, limit = 10, status, sort = '-createdAt' } = options;
			const skip = (page - 1) * limit;

			// Build query
			const query = { clientId };
			if (status) query.status = status;

			const invoices = await Invoice.find(query)
				.populate('clientId', 'name email phone')
				.sort(sort)
				.skip(skip)
				.limit(parseInt(limit));

			const total = await Invoice.countDocuments(query);

			return {
				invoices,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total,
					pages: Math.ceil(total / limit)
				}
			};
		} catch (error) {
			throw new Error(`Failed to fetch invoices for client: ${error.message}`);
		}
	}

	async getInvoiceStats(options = {}) {
		try {
			const { fromDate, toDate } = options;

			// Build date filter
			const dateFilter = {};
			if (fromDate || toDate) {
				dateFilter.createdAt = {};
				if (fromDate) dateFilter.createdAt.$gte = new Date(fromDate);
				if (toDate) dateFilter.createdAt.$lte = new Date(toDate);
			}

			// Get basic counts
			const totalInvoices = await Invoice.countDocuments(dateFilter);
			const paidInvoices = await Invoice.countDocuments({ ...dateFilter, status: 'paid' });
			const pendingInvoices = await Invoice.countDocuments({ ...dateFilter, status: 'pending' });
			const overdueInvoices = await Invoice.countDocuments({ ...dateFilter, status: 'overdue' });

			// Get revenue statistics
			const revenueStats = await Invoice.aggregate([
				{ $match: dateFilter },
				{
					$group: {
						_id: null,
						totalRevenue: { $sum: '$totalAmount' },
						paidRevenue: { $sum: '$paidAmount' },
						pendingRevenue: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } }
					}
				}
			]);

			const revenue = revenueStats[0] || {
				totalRevenue: 0,
				paidRevenue: 0,
				pendingRevenue: 0
			};

			return {
				counts: {
					total: totalInvoices,
					paid: paidInvoices,
					pending: pendingInvoices,
					overdue: overdueInvoices
				},
				revenue: {
					total: revenue.totalRevenue,
					paid: revenue.paidRevenue,
					pending: revenue.pendingRevenue
				}
			};
		} catch (error) {
			throw new Error(`Failed to fetch invoice statistics: ${error.message}`);
		}
	}

	// Helper methods
	async generateInvoiceNumber() {
		const date = new Date();
		const year = date.getFullYear().toString().slice(-2);
		const month = (date.getMonth() + 1).toString().padStart(2, '0');

		const count = await Invoice.countDocuments({
			createdAt: {
				$gte: new Date(date.getFullYear(), date.getMonth(), 1),
				$lt: new Date(date.getFullYear(), date.getMonth() + 1, 1)
			}
		});

		return `INV-${year}-${month}-${(count + 1).toString().padStart(4, '0')}`;
	}

	async processInvoiceItems(items) {
		const processedItems = [];

		for (const item of items) {
			const processedItem = {
				productId: item.productId,
				name: item.name,
				quantity: parseFloat(item.quantity),
				stockUnit: item.stockUnit || 'piece',
				unitPrice: parseFloat(item.unitPrice),
				totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice)
			};

			processedItems.push(processedItem);
		}

		return processedItems;
	}

	calculateTotals(items, invoiceData) {
		const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
		const tax = parseFloat(invoiceData.tax) || 0;
		const discount = parseFloat(invoiceData.discount) || 0;
		const deliveryFee = parseFloat(invoiceData.deliveryFee) || 0;
		const totalAmount = subtotal + tax + deliveryFee - discount;

		return {
			subtotal,
			tax,
			discount,
			deliveryFee,
			totalAmount
		};
	}

	getDefaultDueDate() {
		const date = new Date();
		date.setDate(date.getDate() + 7); // 7 days from now
		return date;
	}

	getBusinessInfo(customBusinessInfo = {}) {
		return {
			name: customBusinessInfo.name || 'SheCares',
			address: customBusinessInfo.address || 'Lagos, Nigeria',
			email: customBusinessInfo.email || 'contact@shecares.com',
			phone: customBusinessInfo.phone || '+234 XXX XXX XXXX',
			logo: customBusinessInfo.logo || ''
		};
	}

	getDefaultPaymentDetails() {
		return {
			bankName: 'Sample Bank',
			accountName: 'SheCares Business',
			accountNumber: '1234567890'
		};
	}

	generateEmailTemplate(invoice) {
		return `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2>Invoice #${invoice.invoiceNumber}</h2>
				<p>Dear ${invoice.clientInfo.name},</p>
				<p>Please find attached your invoice for ₦${invoice.totalAmount.toLocaleString()}.</p>
				<p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
				<p>Payment Details:</p>
				<ul>
					<li>Bank: ${invoice.paymentDetails.bankName}</li>
					<li>Account Name: ${invoice.paymentDetails.accountName}</li>
					<li>Account Number: ${invoice.paymentDetails.accountNumber}</li>
				</ul>
				<p>Thank you for your business!</p>
				<p>Best regards,<br>${invoice.businessInfo.name}</p>
			</div>
		`;
	}
}

module.exports = new InvoiceService();