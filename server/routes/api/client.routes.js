// src/api/routes/client.routes.js

const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { validate } = require('../middleware/validation.middleware');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');
const clientValidator = require('../../domain/validators/client.validator');

/**
 * @route POST /api/clients
 * @desc Create a new client
 * @access Private
 */
router.post('/',
	verifyToken,
	validate(clientValidator.validateCreate),
	clientController.createClient
);

/**
 * @route GET /api/clients
 * @desc Get all clients
 * @access Private
 */
router.get('/',
	verifyToken,
	clientController.getAllClients
);

/**
 * @route GET /api/clients/:id
 * @desc Get client by ID
 * @access Private
 */
router.get('/:id',
	verifyToken,
	clientController.getClientById
);

/**
 * @route PUT /api/clients/:id
 * @desc Update client
 * @access Private
 */
router.put('/:id',
	verifyToken,
	validate(clientValidator.validateUpdate),
	clientController.updateClient
);

/**
 * @route DELETE /api/clients/:id
 * @desc Delete client
 * @access Private/Admin
 */
router.delete('/:id',
	verifyToken,
	requireAdmin,
	clientController.deleteClient
);

/**
 * @route POST /api/clients/:id/locations
 * @desc Add delivery location to client
 * @access Private
 */
router.post('/:id/locations',
	verifyToken,
	validate(clientValidator.validateDeliveryLocation),
	clientController.addDeliveryLocation
);

/**
 * @route DELETE /api/clients/:id/locations/:locationId
 * @desc Remove delivery location from client
 * @access Private
 */
router.delete('/:id/locations/:locationId',
	verifyToken,
);

/**
 * @route POST /api/clients/:id/notes
 * @desc Add note to client
 * @access Private
 */
router.post('/:id/notes',
	verifyToken,
	clientController.addNote
);

/**
 * @route GET /api/clients/:id/orders
 * @desc Get client order history
 * @access Private
 */
router.get('/:id/orders',
	verifyToken,
	clientController.getOrderHistory
);

/**
 * @route PUT /api/clients/:id/preferences
 * @desc Update client preferences
 * @access Private
 */
router.put('/:id/preferences',
	verifyToken,
	clientController.updatePreference
);

/**
 * @route GET /api/clients/search
 * @desc Search clients
 * @access Private
 */
router.get('/search',
	verifyToken,
	clientController.searchClients
);

module.exports = router;