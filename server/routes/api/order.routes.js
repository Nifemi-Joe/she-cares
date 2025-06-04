// src/api/routes/order.routes.js

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const orderValidator = require('../../domain/validators/order.validator');
const { validate } = require('../middleware/validation.middleware');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

/**
 * @route POST /api/orders
 * @desc Create a new order
 * @access Public (clients can place orders without authentication)
 */
router.post('/',
	validate(orderValidator.validateCreate),
	orderController.createOrder
);

/**
 * @route GET /api/orders
 * @desc Get all orders (with filtering options)
 * @access Private
 */
router.get('/',
	verifyToken,
	orderController.getAllOrders
);

/**
 * @route GET /api/orders/stats
 * @desc Get order statistics (basic)
 * @access Private/Admin
 */
router.get('/stats',
	verifyToken,
	requireAdmin,
	orderController.getOrderStats
);

/**
 * @route GET /api/orders/dashboard-stats
 * @desc Get enhanced order statistics for dashboard
 * @access Private/Admin
 */
router.get('/dashboard-stats',
	verifyToken,
	requireAdmin,
	orderController.getStats
);

/**
 * @route GET /api/orders/recent
 * @desc Get recent orders
 * @access Private
 */
router.get('/recent',
	verifyToken,
	orderController.getRecentOrders
);

/**
 * @route GET /api/orders/sales-data
 * @desc Get sales data for charts
 * @access Private/Admin
 */
router.get('/sales-data',
	verifyToken,
	requireAdmin,
	orderController.getSalesData
);

/**
 * @route GET /api/orders/status/:status
 * @desc Get orders by status
 * @access Private
 */
router.get('/status/:status',
	verifyToken,
	orderController.getOrdersByStatus
);

/**
 * @route GET /api/orders/client/:clientId
 * @desc Get orders by client
 * @access Private
 */
router.get('/client/:clientId',
	verifyToken,
	orderController.getOrdersByClient
);

/**
 * @route GET /api/orders/:id
 * @desc Get order by ID
 * @access Mixed (authenticated users or order owner with token)
 */
router.get('/:id',
	orderController.getOrderById
);

/**
 * @route PUT /api/orders/:id
 * @desc Update order details
 * @access Private
 */
router.put('/:id',
	verifyToken,
	validate(orderValidator.validateUpdate),
	orderController.updateOrder
);

/**
 * @route PUT /api/orders/:id/status
 * @desc Update order status
 * @access Private
 */
router.put('/:id/status',
	verifyToken,
	validate(orderValidator.validateStatusUpdate),
	orderController.updateOrderStatus
);

/**
 * @route PUT /api/orders/:id/delivery
 * @desc Set delivery method and address
 * @access Private
 */
router.put('/:id/delivery',
	verifyToken,
	orderController.setDeliveryMethod
);

/**
 * @route PUT /api/orders/:id/discount
 * @desc Apply discount to order
 * @access Private
 */
router.put('/:id/discount',
	verifyToken,
	orderController.applyDiscount
);

/**
 * @route PUT /api/orders/:id/payment
 * @desc Update payment details
 * @access Private
 */
router.put('/:id/payment',
	verifyToken,
	orderController.updatePayment
);

/**
 * @route POST /api/orders/:id/notes
 * @desc Add note to order
 * @access Private
 */
router.post('/:id/notes',
	verifyToken,
	orderController.addNote
);

/**
 * @route POST /api/orders/:id/items
 * @desc Add item to order
 * @access Private
 */
router.post('/:id/items',
	verifyToken,
	orderController.addOrderItem
);

/**
 * @route PUT /api/orders/:id/items/:itemId
 * @desc Update order item
 * @access Private
 */
router.put('/:id/items/:itemId',
	verifyToken,
	orderController.updateOrderItem
);

/**
 * @route DELETE /api/orders/:id/items/:itemId
 * @desc Remove item from order
 * @access Private
 */
router.delete('/:id/items/:itemId',
	verifyToken,
	orderController.removeOrderItem
);

/**
 * @route GET /api/orders/:id/invoice
 * @desc Generate invoice for order
 * @access Private
 */
router.get('/:id/invoice',
	orderController.generateInvoice
);

/**
 * @route POST /api/orders/:id/confirm
 * @desc Confirm order (transition from draft to confirmed)
 * @access Mixed (staff or order owner)
 */
// router.post('/:id/confirm',
//     orderController.confirmOrder
// );

/**
 * @route DELETE /api/orders/:id
 * @desc Cancel/delete order
 * @access Mixed (staff or order owner)
 */
// router.delete('/:id',
//     orderController.cancelOrder
// );

module.exports = router;