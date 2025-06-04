// src/api/routes/client.routes.js

const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { validate } = require('../middleware/validation.middleware');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');
const clientValidator = require('../../domain/validators/client.validator');

/**
 * @route GET /api/clients/stats
 * @desc Get client statistics for dashboard
 * @access Private
 */
router.get('/stats',
	verifyToken,
	clientController.getStats
);

/**
 * @route GET /api/clients/search
 * @desc Search clients
 * @access Private
 * @note This route must be BEFORE /:clientId to avoid conflict
 */
router.get('/search',
	verifyToken,
	clientController.searchClients
);

/**
 * @route POST /api/clients
 * @desc Create a new client
 * @access Private
 */
router.post('/',
	validate(clientData => clientValidator.validateCreate(clientData)),
	clientController.createClient
);

/**
 * @route GET /api/clients/check-email
 * @desc Check if client exists by email
 * @access Private
 * @query email - Client email to check
 */
router.get('/check-email',
	clientController.checkClientByEmail
);

/**
 * @route GET /api/clients
 * @desc Get all clients with filtering and pagination
 * @access Private
 */
router.get('/',
	verifyToken,
	clientController.getClients
);

/**
 * @route GET /api/clients/:clientId
 * @desc Get client by ID
 * @access Private
 */
router.get('/:clientId',
	verifyToken,
	clientController.getClientById
);

/**
 * @route PUT /api/clients/:clientId
 * @desc Update client
 * @access Private
 */
router.put('/:clientId',
	verifyToken,
	validate(updateData => clientValidator.validateUpdate(updateData)),
	clientController.updateClient
);

/**
 * @route DELETE /api/clients/:clientId
 * @desc Delete client
 * @access Private/Admin
 */
router.delete('/:clientId',
	verifyToken,
	requireAdmin,
	clientController.deleteClient
);

/**
 * @route POST /api/clients/:clientId/locations
 * @desc Add delivery location to client
 * @access Private
 */
router.post('/:clientId/locations',
	verifyToken,
	validate(locationData => clientValidator.validateDeliveryLocation(locationData)),
	clientController.addDeliveryLocation
);

/**
 * @route DELETE /api/clients/:clientId/locations/:locationId
 * @desc Remove delivery location from client
 * @access Private
 */
router.delete('/:clientId/locations/:locationId',
	verifyToken,
	clientController.removeDeliveryLocation
);

/**
 * @route POST /api/clients/:clientId/notes
 * @desc Add note to client
 * @access Private
 */
router.post('/:clientId/notes',
	verifyToken,
	clientController.addNote
);

/**
 * @route GET /api/clients/:clientId/orders
 * @desc Get client order history
 * @access Private
 */
router.get('/:clientId/orders',
	verifyToken,
	clientController.getOrderHistory
);

/**
 * @route PUT /api/clients/:clientId/preferences
 * @desc Update client preferences
 * @access Private
 */
router.put('/:clientId/preferences',
	verifyToken,
	clientController.updatePreference
);

module.exports = router;
