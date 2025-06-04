// src/api/routes/delivery.routes.js

const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/delivery.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');
const deliveryValidator = require('../../domain/validators/delivery.validator');
const { validate } = require('../middleware/validation.middleware');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');
/**
 * @route POST /api/deliveries
 * @desc Create a new delivery
 * @access Private
 */
router.post('/',
	verifyToken,
	validate(deliveryValidator.validateCreate),
	deliveryController.createDelivery
);

/**
 * @route GET /api/deliveries
 * @desc Get all deliveries
 * @access Private
 */
router.get('/',
	verifyToken,
	deliveryController.getAllDeliveries
);

/**
 * @route GET /api/deliveries/:id
 * @desc Get delivery by ID
 * @access Mixed (authenticated users or client with tracking code)
 */
router.get('/:id',
	deliveryController.getDeliveryById
);

/**
 * @route PUT /api/deliveries/:id/status
 * @desc Update delivery status
 * @access Private
 */
router.put('/:id/status',
	verifyToken,
	validate(deliveryValidator.validateStatusTransition),
	deliveryController.updateDeliveryStatus
);

/**
 * @route PUT /api/deliveries/:id
 * @desc Update delivery details
 * @access Private
 */
router.put('/:id',
	verifyToken,
	validate(deliveryValidator.validateUpdate),
	deliveryController.updateDelivery
);

/**
 * @route DELETE /api/deliveries/:id
 * @desc Cancel delivery
 * @access Private
 */
router.delete('/:id',
	verifyToken,
	deliveryController.deleteDelivery
);

/**
 * @route GET /api/deliveries/order/:orderId
 * @desc Get delivery by order ID
 * @access Mixed (authenticated users or client with order ID)
 */
router.get('/order/:orderId',
	deliveryController.getDeliveriesByOrder
);

/**
 * @route POST /api/deliveries/:id/track
 * @desc Track delivery with tracking code
 * @access Public
 */
router.post('/track',
	// validate(deliveryValidator.),
	deliveryController.getDeliveryById
);

/**
 * @route POST /api/deliveries/:id/complete
 * @desc Mark delivery as completed
 * @access Private
 */
router.post('/:id/complete',
	verifyToken,
	deliveryController.completeDelivery
);

/**
 * @route GET /api/deliveries/scheduled
 * @desc Get scheduled deliveries for specified date range
 * @access Private
 */
router.get('/scheduled',
	verifyToken,
	deliveryController.getPendingDeliveriesDashboard
);

/**
 * @route POST /api/deliveries/:id/notes
 * @desc Add delivery note
 * @access Private
 */
// router.post('/:id/notes',
// 	verifyToken,
// 	deliveryController.addDeliveryNote
// );

/**
 * @route POST /api/deliveries/zones
 * @desc Create delivery zone
 * @access Private/Admin
 */
// router.post('/zones',
// 	verifyToken,
// 	requireAdmin,
// 	validate(deliveryValidator.deliveryZoneSchema),
// 	deliveryController.createDeliveryZone
// );

/**
 * @route GET /api/deliveries/zones
 * @desc Get all delivery zones
 * @access Public
 */
// router.get('/zones',
// 	deliveryController.getAllDeliveryZones
// );

module.exports = router;