// src/services/invoice.service.js

const invoiceRepository = require('../data/repositories/invoice.repository');
const orderRepository = require('../data/repositories/order.repository');
const clientRepository = require('../data/repositories/client.repository');
const pdfService = require('./pdf.service');
const emailService = require('./email.service');
const { NotFoundError, ValidationError } = require('../utils/error-handler');
const config = require('../config/app.config');

/**
 * @class InvoiceService
 * @description Service handling invoice operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class InvoiceService {
	/**
	 * Create a new invoice
	 * @param {Object} invoiceData - Invoice data
	 * @returns {Object} Created invoice
	 */
	async createInvoice(invoiceData) {
		// Validate required fields
		if (!invoiceData.orderId) {
			throw new ValidationError('Order ID is required');
		}

		// Check if order exists
		const order = await orderRepository.findById(invoiceData.orderId);
		if (!order) {
			throw new NotFoundError('Order not found');
		}

		// Check if invoice already exists for this order
		const existingInvoice = await invoiceRepository.findByOrderId(invoiceData.orderId);
		if (existingInvoice) {
			throw new ValidationError('Invoice already exists for this order');
		}

		// Generate invoice number
		const invoiceNumber = await this._generateInvoiceNumber();

		// Create invoice
		const invoice = await invoiceRepository.create({
			...invoiceData,
			invoiceNumber,
			status: invoiceData.status || 'pending',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		return invoice;
	}

	/**
	 * Get all invoices
	 * @param {Object} options - Query options (pagination, sorting, filtering)
	 * @returns {Array} List of invoices
	 */
	async getAllInvoices(options = {}) {
		return invoiceRepository.findAll(options);
	}

	/**
	 * Get invoice by ID
	 * @param {string} invoiceId - Invoice ID
	 * @returns {Object} Invoice
	 */
	async getInvoiceById(invoiceId) {
		const invoice = await invoiceRepository.findById(invoiceId);
		if (!invoice) {
			throw new NotFoundError('Invoice not found');
		}
		return invoice;
	}

	/**
	 * Get invoice by order ID
	 * @param {string} orderId - Order ID
	 * @returns {Object} Invoice
	 */
	async getInvoiceByOrderId(orderId) {
		const invoice = await invoiceRepository.findByOrderId(orderId);
		if (!invoice) {
			throw new NotFoundError('Invoice not found for this order');
		}
		return invoice;
	}

	/**
	 * Update invoice
	 * @param {string} invoiceId - Invoice ID
	 * @param {Object} updateData - Invoice update data
	 * @returns {Object} Updated invoice
	 */
	async updateInvoice(invoiceId, updateData) {
		// Check if invoice exists
		const invoice = await invoiceRepository.findById(invoiceId);
		if (!invoice) {
			throw new NotFoundError('Invoice not found');
		}

		// Prevent updating certain fields
		const { invoiceNumber, orderId, ...allowedUpdates } = updateData;

		if (invoiceNumber) {
			throw new ValidationError('Invoice number cannot be updated');
		}

		if (orderId) {
			throw new ValidationError('Order ID cannot be updated');
		}

		// Update invoice
		return invoiceRepository.update(invoiceId, {
			...allowedUpdates,
			updatedAt: new Date()
		});
	}

	/**
	 * Update invoice status
	 * @param {string} invoiceId - Invoice ID
	 * @param {string} status - Invoice status (pending, paid, cancelled)
	 * @returns {Object} Updated invoice
	 */
	async updateInvoiceStatus(invoiceId, status) {
		// Check if invoice exists
		const invoice = await invoiceRepository.findById(invoiceId);
		if (!invoice) {
			throw new NotFoundError('Invoice not found');
		}

		// Validate status
		const validStatuses = ['pending', 'paid', 'cancelled', 'partially_paid'];
		if (!validStatuses.includes(status)) {
			throw new ValidationError('Invalid invoice status');
		}

		// Update status
		return invoiceRepository.update(invoiceId, {
			status,
			updatedAt: new Date()
		});
	}

	/**
	 * Delete invoice
	 * @param {string} invoiceId - Invoice ID
	 * @returns {boolean} Whether invoice was deleted
	 */
	async deleteInvoice(invoiceId) {
		// Check if invoice exists
		const invoice = await invoiceRepository.findById(invoiceId);
		if (!invoice) {
			throw new NotFoundError('Invoice not found');
		}

		// Consider checking if invoice can be deleted based on status
		if (invoice.status === 'paid') {
			throw new ValidationError('Paid invoices cannot be deleted');
		}

		return invoiceRepository.delete(invoiceId);
	}

	/**
	 * Generate PDF for invoice
	 * @param {string} invoiceId - Invoice ID
	 * @returns {Buffer} PDF buffer
	 */
	async generateInvoicePDF(invoiceId) {
		// Get invoice with related data
		const invoice = await this._getInvoiceWithDetails(invoiceId);

		// Generate PDF using PDF service
		return pdfService.generateInvoice(invoice);
	}

	/**
	 * Send invoice via email
	 * @param {string} invoiceId - Invoice ID
	 * @param {Object} options - Email options (optional)
	 * @returns {boolean} Whether email was sent
	 */
	async sendInvoiceByEmail(invoiceId, options = {}) {
		// Get invoice with related data
		const invoice = await this._getInvoiceWithDetails(invoiceId);

		// Check if client has email
		if (!invoice.client || !invoice.client.email) {
			throw new ValidationError('Client has no email address');
		}

		// Generate PDF
		const pdfBuffer = await this.generateInvoicePDF(invoiceId);

		// Prepare email data
		const emailData = {
			to: invoice.client.email,
			subject: options.subject || `Invoice #${invoice.invoiceNumber} from ${config.businessName}`,
			text: options.text || `Please find attached your invoice #${invoice.invoiceNumber}.`,
			attachments: [
				{
					filename: `Invoice-${invoice.invoiceNumber}.pdf`,
					content: pdfBuffer
				}
			]
		};

		// Send email
		await emailService.sendEmail(emailData);

		// Update invoice sent status
		await invoiceRepository.update(invoiceId, {
			lastSentAt: new Date(),
			updatedAt: new Date()
		});

		return true;
	}

	/**
	 * Record payment for invoice
	 * @param {string} invoiceId - Invoice ID
	 * @param {Object} paymentData - Payment data
	 * @returns {Object} Updated invoice
	 */
	async recordPayment(invoiceId, paymentData) {
		// Check if invoice exists
		const invoice = await invoiceRepository.findById(invoiceId);
		if (!invoice) {
			throw new NotFoundError('Invoice not found');
		}

		// Validate payment data
		if (!paymentData.amount || isNaN(parseFloat(paymentData.amount))) {
			throw new ValidationError('Valid payment amount is required');
		}

		const paymentAmount = parseFloat(paymentData.amount);
		const invoiceTotal = parseFloat(invoice.totalAmount);

		// Determine new status based on payment
		let newStatus = invoice.status;
		if (paymentAmount >= invoiceTotal) {
			newStatus = 'paid';
		} else if (paymentAmount > 0) {
			newStatus = 'partially_paid';
		}

		// Add payment record to invoice
		const payments = invoice.payments || [];
		payments.push({
			id: `payment_${Date.now()}`,
			amount: paymentAmount,
			method: paymentData.method || 'other',
			reference: paymentData.reference || '',
			date: paymentData.date || new Date(),
			notes: paymentData.notes || ''
		});

		// Update invoice
		return invoiceRepository.update(invoiceId, {
			payments,
			status: newStatus,
			paidAmount: (parseFloat(invoice.paidAmount) || 0) + paymentAmount,
			updatedAt: new Date()
		});
	}

	/**
	 * Get invoices by client ID
	 * @param {string} clientId - Client ID
	 * @param {Object} options - Query options
	 * @returns {Array} Client invoices
	 */
	async getInvoicesByClient(clientId, options = {}) {
		// Check if client exists
		const client = await clientRepository.findById(clientId);
		if (!client) {
			throw new NotFoundError('Client not found');
		}

		return invoiceRepository.findByClientId(clientId, options);
	}

	/**
	 * Get invoice statistics
	 * @param {Object} options - Filter options (date range, etc.)
	 * @returns {Object} Invoice statistics
	 */
	async getInvoiceStats(options = {}) {
		return invoiceRepository.getStats(options);
	}

	/**
	 * Get invoice with detailed information
	 * @param {string} invoiceId - Invoice ID
	 * @returns {Object} Invoice with details
	 * @private
	 */
	async _getInvoiceWithDetails(invoiceId) {
		const invoice = await invoiceRepository.findById(invoiceId);
		if (!invoice) {
			throw new NotFoundError('Invoice not found');
		}

		// Get order details
		const order = await orderRepository.findById(invoice.orderId);
		if (!order) {
			throw new NotFoundError('Order not found');
		}

		// Get client details
		const client = await clientRepository.findById(order.clientId);

		// Combine all data
		return {
			...invoice,
			order,
			client
		};
	}

	/**
	 * Generate unique invoice number
	 * @returns {string} Invoice number
	 * @private
	 */
	async _generateInvoiceNumber() {
		const date = new Date();
		const year = date.getFullYear().toString().slice(-2);
		const month = (date.getMonth() + 1).toString().padStart(2, '0');

		// Get count of invoices for this month
		const monthlyCount = await invoiceRepository.countByMonthYear(month, year);

		// Format: INV-YY-MM-XXXX where XXXX is sequential
		return `INV-${year}-${month}-${(monthlyCount + 1).toString().padStart(4, '0')}`;
	}
}

module.exports = new InvoiceService();