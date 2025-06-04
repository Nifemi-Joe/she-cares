// src/api/routes/invoice.routes.js

const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const invoiceValidator = require('../../domain/validators/invoice.validator');
const { validate, validatePagination } = require('../middleware/validation.middleware');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

/**
 * @route POST /api/invoices
 * @desc Create a new invoice
 * @access Private
 */
router.post('/',
	verifyToken,
	validate(invoiceValidator.createInvoiceSchema, 'body'),
	invoiceController.createInvoice
);

/**
 * @route GET /api/invoices
 * @desc Get all invoices
 * @access Private
 */
router.get('/',
	verifyToken,
	validatePagination,
	invoiceController.getAllInvoices
);

/**
 * @route GET /api/invoices/stats
 * @desc Get invoice statistics
 * @access Private/Admin
 * @note This route must be before /:id to avoid conflicts
 */
router.get('/stats',
	verifyToken,
	requireAdmin,
	invoiceController.getInvoiceStats
);

/**
 * @route GET /api/invoices/:id
 * @desc Get invoice by ID
 * @access Mixed (authenticated users or invoice owner with token)
 */
router.get('/:id',
	validate(invoiceValidator.validateInvoiceId, 'params'),
	invoiceController.getInvoiceById
);

/**
 * @route GET /api/invoices/order/:orderId
 * @desc Get invoice by order ID
 * @access Mixed (authenticated users or order owner with token)
 */
router.get('/order/:orderId',
	validate(invoiceValidator.validateOrderId, 'params'),
	invoiceController.getInvoiceByOrderId
);

/**
 * @route GET /api/invoices/client/:clientId
 * @desc Get invoices by client ID
 * @access Private
 */
router.get('/client/:clientId',
	verifyToken,
	validate(invoiceValidator.validateClientId, 'params'),
	validatePagination,
	invoiceController.getInvoicesByClient
);

/**
 * @route PUT /api/invoices/:id
 * @desc Update invoice
 * @access Private
 */
router.put('/:id',
	verifyToken,
	validate(invoiceValidator.validateInvoiceId, 'params'),
	validate(invoiceValidator.updateInvoiceSchema, 'body'),
	invoiceController.updateInvoice
);

/**
 * @route PUT /api/invoices/:id/status
 * @desc Update invoice status
 * @access Private
 */
router.put('/:id/status',
	verifyToken,
	validate(invoiceValidator.validateInvoiceId, 'params'),
	validate(invoiceValidator.updateInvoiceStatusSchema, 'body'),
	invoiceController.updateInvoiceStatus
);

/**
 * @route DELETE /api/invoices/:id
 * @desc Delete invoice
 * @access Private/Admin
 */
router.delete('/:id',
	verifyToken,
	requireAdmin,
	validate(invoiceValidator.validateInvoiceId, 'params'),
	invoiceController.deleteInvoice
);

/**
 * @route GET /api/invoices/:id/pdf
 * @desc Generate PDF for invoice
 * @access Mixed (authenticated users or invoice owner with token)
 */
router.get('/:id/pdf',
	validate(invoiceValidator.validateInvoiceId, 'params'),
	invoiceController.generateInvoicePDF
);

/**
 * @route POST /api/invoices/:id/send
 * @desc Send invoice via email
 * @access Private
 */
router.post('/:id/send',
	verifyToken,
	validate(invoiceValidator.validateInvoiceId, 'params'),
	validate(invoiceValidator.sendInvoiceSchema, 'body'),
	invoiceController.sendInvoiceByEmail
);

/**
 * @route POST /api/invoices/:id/payment
 * @desc Record payment for invoice
 * @access Private
 */
router.post('/:id/payment',
	verifyToken,
	validate(invoiceValidator.validateInvoiceId, 'params'),
	validate(invoiceValidator.recordPaymentSchema, 'body'),
	invoiceController.recordPayment
);

module.exports = router;