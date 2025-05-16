// src/api/controllers/client.controller.js

const clientService = require('../../services/client.service');
const { ValidationError } = require('../../utils/error-handler');

/**
 * @class ClientController
 * @description Controller handling client/customer-related requests
 * @since v1.2.0 (2023)
 * @author SheCares Development Team
 */
class ClientController {
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
				success: true,
				data: client,
				message: 'Client created successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get all clients
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getAllClients(req, res, next) {
		try {
			const {
				page = 1,
				limit = 10,
				sort = 'name',
				order = 'asc'
			} = req.query;

			const options = {
				page: parseInt(page, 10),
				limit: parseInt(limit, 10),
				sort,
				order
			};

			const clients = await clientService.getAllClients(options);

			res.status(200).json({
				success: true,
				data: clients.items,
				pagination: {
					page: options.page,
					limit: options.limit,
					total: clients.total,
					pages: Math.ceil(clients.total / options.limit)
				}
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
				success: true,
				data: client
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
				success: true,
				data: updatedClient,
				message: 'Client updated successfully'
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
				success: true,
				message: 'Client deleted successfully'
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
				success: true,
				data: updatedClient,
				message: 'Delivery location added successfully'
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
				success: true,
				data: updatedClient,
				message: 'Delivery location removed successfully'
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
				success: true,
				data: updatedClient,
				message: 'Note added successfully'
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
				success: true,
				data: updatedClient,
				message: 'Preference updated successfully'
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
				success: true,
				data: orders.items,
				pagination: {
					page: options.page,
					limit: options.limit,
					total: orders.total,
					pages: Math.ceil(orders.total / options.limit)
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
				success: true,
				data: clients
			});
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new ClientController();