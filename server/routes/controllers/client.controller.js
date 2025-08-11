// src/api/controllers/client.controller.js

const { ValidationError } = require('../../utils/error-handler');
const ClientService = require('../../services/client.service');
const clientRepository = require('../../data/repositories/client.repository');
const orderRepository = require('../../data/repositories/order.repository');
const eventDispatcher = require('../../domain/events/event-dispatcher');
const logger = require('../../infrastructure/logging/logger');

const clientService = new ClientService(
	clientRepository,
	orderRepository,
	eventDispatcher,
	logger
);
/**
 * @class ClientController
 * @description Controller handling client/customer-related requests
 * @since v1.2.0 (2023)
 * @author SheCares Development Team
 */
class ClientController {
	/**
	 * Get client statistics for dashboard
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getStats(req, res, next) {
		try {
			const filters = req.query;
			const stats = await clientService.getStats(filters);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: stats
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Create a new client
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async createClient(req, res, next) {
		try {
			const clientData = req.body;

			if (!clientData.name) {
				throw new ValidationError('Client name is required');
			}

			const client = await clientService.createClient(clientData);

			res.status(201).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: client
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Check if client exists by email
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async checkClientByEmail(req, res, next) {
		try {
			const { email } = req.query;

			if (!email) {
				throw new ValidationError('Email is required');
			}

			const result = await clientService.checkClientByEmail(email);

			if (!result) {
				return res.status(200).json({
					responseCode: 200,
					responseMessage: 'Client not found',
					responseData: {
						exists: false,
						id: null
					}
				});
			}

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Client found',
				responseData: result
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get all clients with filtering and pagination
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getClients(req, res, next) {
		try {
			const {
				page = 1,
				limit = 10,
				sort,
				isActive,
				search
			} = req.query;

			const filters = {};
			if (isActive !== undefined) {
				filters.isActive = isActive === 'true';
			}
			if (search) {
				filters.search = search;
			}

			const options = {
				page: parseInt(page, 10),
				limit: parseInt(limit, 10),
				sort: sort ? JSON.parse(sort) : { createdAt: -1 }
			};

			const result = await clientService.getClients(filters, options);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: result
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get client by ID
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getClientById(req, res, next) {
		try {
			const { clientId } = req.params;
			const client = await clientService.getClientById(clientId);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: client
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Update client
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updateClient(req, res, next) {
		try {
			const { clientId } = req.params;
			const updateData = req.body;

			const updatedClient = await clientService.updateClient(clientId, updateData);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: updatedClient
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Delete client
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async deleteClient(req, res, next) {
		try {
			const { clientId } = req.params;
			await clientService.deleteClient(clientId);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Add delivery location to client
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async addDeliveryLocation(req, res, next) {
		try {
			const { clientId } = req.params;
			const locationData = req.body;

			if (!locationData.street || !locationData.city) {
				throw new ValidationError('Street and city are required for delivery location');
			}

			const updatedClient = await clientService.addClientDeliveryLocation(clientId, locationData);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: updatedClient
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Remove delivery location from client
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async removeDeliveryLocation(req, res, next) {
		try {
			const { clientId, locationId } = req.params;

			const updatedClient = await clientService.removeClientDeliveryLocation(clientId, locationId);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: updatedClient
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Add note to client
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async addNote(req, res, next) {
		try {
			const { clientId } = req.params;
			const { note } = req.body;

			if (!note) {
				throw new ValidationError('Note text is required');
			}

			const updatedClient = await clientService.addClientNote(clientId, note);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: updatedClient
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Update client preference
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updatePreference(req, res, next) {
		try {
			const { clientId } = req.params;
			const { key, value } = req.body;

			if (!key) {
				throw new ValidationError('Preference key is required');
			}

			const updatedClient = await clientService.updateClientPreference(clientId, key, value);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: updatedClient
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get client order history
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getOrderHistory(req, res, next) {
		try {
			const { clientId } = req.params;
			const {
				page = 1,
				limit = 10,
				sort = 'createdAt',
				order = 'desc'
			} = req.query;

			const options = {
				page: parseInt(page, 10),
				limit: parseInt(limit, 10),
				sort,
				order
			};

			const orders = await clientService.getClientOrderHistory(clientId, options);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: {
					items: orders.items,
					pagination: {
						page: options.page,
						limit: options.limit,
						total: orders.total,
						pages: Math.ceil(orders.total / options.limit)
					}
				}
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Search clients
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async searchClients(req, res, next) {
		try {
			const { query } = req.query;

			if (!query || query.trim() === '') {
				throw new ValidationError('Search query is required');
			}

			const clients = await clientService.searchClients(query);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Completed Successfully',
				responseData: clients
			});
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new ClientController();