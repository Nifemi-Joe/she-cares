// src/api/routes/invoice.routes.js

const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const invoiceValidator = require('../../domain/validators/invoice.validator');
const { validate } = require('../middleware/validation.middleware');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');
/**
 * @route POST /api/invoices
 * @desc Create a new invoice
 * @access Private
 */
router.post('/',
	verifyToken,
	validate(invoiceValidator.createInvoiceSchema),
	invoiceController.createInvoice
);

/**
 * @route GET /api/invoices
 * @desc Get all invoices
 * @access Private
 */
router.get('/',
	verifyToken,
	invoiceController.getAllInvoices
);

/**
 * @route GET /api/invoices/:id
 * @desc Get invoice by ID
 * @access Mixed (authenticated users or invoice owner with token)
 */
router.get('/:id',
	invoiceController.getInvoiceById
);

/**
 * @route GET /api/invoices/order/:orderId
 * @desc Get invoice by order ID
 * @access Mixed (authenticated users or order owner with token)
 */
router.get('/order/:orderId',
	invoiceController.getInvoiceByOrderId
);

/**
 * @route PUT /api/invoices/:id
 * @desc Update invoice
 * @access Private
 */
router.put('/:id',
	verifyToken,
	validate(invoiceValidator.updateInvoiceSchema),
	invoiceController.updateInvoice
);

/**
 * @route PUT /api/invoices/:id/status
 * @desc Update invoice status
 * @access Private
 */
router.put('/:id/status',
	verifyToken,
	validate(invoiceValidator.updateInvoiceStatusSchema),
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
	invoiceController.deleteInvoice
);

/**
 * @route GET /api/invoices/:id/pdf
 * @desc Generate PDF for invoice
 * @access Mixed (authenticated users or invoice owner with token)
 */
router.get('/:id/pdf',
	invoiceController.generateInvoicePDF
);

/**
 * @route POST /api/invoices/:id/send
 * @desc Send invoice via email
 * @access Private
 */
router.post('/:id/send',
	verifyToken,
	validate(invoiceValidator.sendInvoiceSchema),
	invoiceController.sendInvoiceByEmail
);

/**
 * @route POST /api/invoices/:id/payment
 * @desc Record payment for invoice
 * @access Private
 */
router.post('/:id/payment',
	verifyToken,
	validate(invoiceValidator.recordPaymentSchema),
	invoiceController.recordPayment
);

/**
 * @route GET /api/invoices/client/:clientId
 * @desc Get invoices by client ID
 * @access Private
 */
router.get('/client/:clientId',
	verifyToken,
	invoiceController.getInvoicesByClient
);

/**
 * @route GET /api/invoices/stats
 * @desc Get invoice statistics
 * @access Private/Admin
 */
router.get('/stats',
	verifyToken,
	requireAdmin,
	invoiceController.getInvoiceStats
);

module.exports = router;