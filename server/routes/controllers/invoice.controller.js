// src/api/controllers/invoice.controller.js

const invoiceService = require('../../services/invoice.service');
const { ValidationError } = require('../../utils/error-handler');

/**
 * @class InvoiceController
 * @description Controller handling invoice-related HTTP requests
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class InvoiceController {
	/**
	 * Create a new invoice
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async createInvoice(req, res, next) {
		try {
			const invoiceData = req.body;
			const invoice = await invoiceService.createInvoice(invoiceData);
			res.status(201).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: invoice
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Failed to create invoice'
			});
		}
	}

	/**
	 * Get all invoices
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getAllInvoices(req, res, next) {
		try {
			const options = {
				page: parseInt(req.query.page, 10) || 1,
				limit: parseInt(req.query.limit, 10) || 10,
				sort: req.query.sort || '-createdAt',
				status: req.query.status,
				fromDate: req.query.fromDate,
				toDate: req.query.toDate,
				clientId: req.query.clientId
			};

			const invoices = await invoiceService.getAllInvoices(options);
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: invoices
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Failed to fetch invoices'
			});
		}
	}

	/**
	 * Get invoice by ID
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getInvoiceById(req, res, next) {
		try {
			const { id } = req.params;
			const invoice = await invoiceService.getInvoiceById(id);
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: invoice
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Invoice not found'
			});
		}
	}

	/**
	 * Get invoice by order ID
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getInvoiceByOrderId(req, res, next) {
		try {
			const { orderId } = req.params;
			const invoice = await invoiceService.getInvoiceByOrderId(orderId);
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: invoice
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Invoice not found for order'
			});
		}
	}

	/**
	 * Update invoice
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updateInvoice(req, res, next) {
		try {
			const { id } = req.params;
			const updateData = req.body;
			const updatedInvoice = await invoiceService.updateInvoice(id, updateData);
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: updatedInvoice
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Failed to update invoice'
			});
		}
	}

	/**
	 * Update invoice status
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updateInvoiceStatus(req, res, next) {
		try {
			const { id } = req.params;
			const { status } = req.body;

			if (!status) {
				throw new ValidationError('Status is required');
			}

			const updatedInvoice = await invoiceService.updateInvoiceStatus(id, status);
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: updatedInvoice
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Failed to update invoice status'
			});
		}
	}

	/**
	 * Delete invoice
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async deleteInvoice(req, res, next) {
		try {
			const { id } = req.params;
			await invoiceService.deleteInvoice(id);
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully'
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Failed to delete invoice'
			});
		}
	}

	/**
	 * Generate PDF for invoice
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async generateInvoicePDF(req, res, next) {
		try {
			const { id } = req.params;
			const pdfBuffer = await invoiceService.generateInvoicePDF(id);

			// Set response headers
			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader('Content-Disposition', `attachment; filename=Invoice-${id}.pdf`);

			// Send PDF
			res.status(200).send(pdfBuffer);
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Failed to generate invoice PDF'
			});
		}
	}

	/**
	 * Send invoice via email
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async sendInvoiceByEmail(req, res, next) {
		try {
			const { id } = req.params;
			const options = req.body || {};

			await invoiceService.sendInvoiceByEmail(id, options);
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully'
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Failed to send invoice by email'
			});
		}
	}

	/**
	 * Record payment for invoice
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async recordPayment(req, res, next) {
		try {
			const { id } = req.params;
			const paymentData = req.body;

			if (!paymentData.amount) {
				throw new ValidationError('Payment amount is required');
			}

			const updatedInvoice = await invoiceService.recordPayment(id, paymentData);
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: updatedInvoice
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Failed to record payment'
			});
		}
	}

	/**
	 * Get invoices by client
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getInvoicesByClient(req, res, next) {
		try {
			const { clientId } = req.params;
			const options = {
				page: parseInt(req.query.page, 10) || 1,
				limit: parseInt(req.query.limit, 10) || 10,
				sort: req.query.sort || '-createdAt',
				status: req.query.status
			};

			const invoices = await invoiceService.getInvoicesByClient(clientId, options);
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: invoices
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Failed to fetch invoices for client'
			});
		}
	}

	/**
	 * Get invoice statistics
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getInvoiceStats(req, res, next) {
		try {
			const options = {
				fromDate: req.query.fromDate,
				toDate: req.query.toDate
			};

			const stats = await invoiceService.getInvoiceStats(options);
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: stats
			});
		} catch (error) {
			res.status(404).json({
				responseCode: 404,
				responseMessage: error.message || 'Failed to fetch invoice statistics'
			});
		}
	}
}

module.exports = new InvoiceController();