// services/invoice.service.js - Complete Invoice Service
// ================================
const Invoice = require('../data/schemas/invoice.schema');
const Client = require('../data/schemas/client.schema');
const Product = require('../data/schemas/product.schema');
const PDFService = require('./pdf.service');
const EmailService = require('./email.service');

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
				stockUnit: item.stockUnit || 'piece',
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
				orderId: invoiceData.orderId || undefined, // Convert null to undefined
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

	async getInvoiceById(invoiceId) {
		try {
			const invoice = await Invoice.findById(invoiceId)
				.populate('clientId', 'name email phone address');

			if (!invoice) {
				throw new Error('Invoice not found');
			}

			return invoice;
		} catch (error) {
			throw new Error(`Failed to fetch invoice: ${error.message}`);
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