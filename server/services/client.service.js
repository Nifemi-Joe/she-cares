// src/services/client.service.js

const clientRepository = require('../data/repositories/client.repository');
const { NotFoundError, ValidationError } = require('../utils/error-handler');
const Client = require('../domain/models/client.model');

/**
 * @class ClientService
 * @description Service handling client/customer operations
 * @since v1.2.0 (2023)
 * @author SheCares Development Team
 */
class ClientService {
	/**
	 * Create a new client
	 * @param {Object} clientData - Client data
	 * @returns {Object} Created client
	 */
	async createClient(clientData) {
		// Basic validation
		if (!clientData.name) {
			throw new ValidationError('Client name is required');
		}

		// Check for duplicate email if provided
		if (clientData.email) {
			const existingClient = await clientRepository.findByEmail(clientData.email);
			if (existingClient) {
				throw new ValidationError('Client with this email already exists');
			}
		}

		// Check for duplicate phone if provided
		if (clientData.phone) {
			const existingClient = await clientRepository.findByPhone(clientData.phone);
			if (existingClient) {
				throw new ValidationError('Client with this phone number already exists');
			}
		}

		return clientRepository.create(clientData);
	}

	/**
	 * Get all clients
	 * @param {Object} options - Query options (pagination, sorting, filtering)
	 * @returns {Array} List of clients
	 */
	async getAllClients(options = {}) {
		return clientRepository.findAll(options);
	}

	/**
	 * Get client by ID
	 * @param {string} clientId - Client ID
	 * @returns {Object} Client
	 */
	async getClientById(clientId) {
		const client = await clientRepository.findById(clientId);
		if (!client) {
			throw new NotFoundError('Client not found');
		}
		return client;
	}

	/**
	 * Update client
	 * @param {string} clientId - Client ID
	 * @param {Object} updateData - Client update data
	 * @returns {Object} Updated client
	 */
	async updateClient(clientId, updateData) {
		// Check if client exists
		const client = await clientRepository.findById(clientId);
		if (!client) {
			throw new NotFoundError('Client not found');
		}

		// Check for duplicate email if being updated
		if (updateData.email && updateData.email !== client.email) {
			const existingClient = await clientRepository.findByEmail(updateData.email);
			if (existingClient && existingClient.id !== clientId) {
				throw new ValidationError('Another client with this email already exists');
			}
		}

		// Check for duplicate phone if being updated
		if (updateData.phone && updateData.phone !== client.phone) {
			const existingClient = await clientRepository.findByPhone(updateData.phone);
			if (existingClient && existingClient.id !== clientId) {
				throw new ValidationError('Another client with this phone number already exists');
			}
		}

		return clientRepository.update(clientId, updateData);
	}

	/**
	 * Delete client
	 * @param {string} clientId - Client ID
	 * @returns {boolean} Whether client was deleted
	 */
	async deleteClient(clientId) {
		// Check if client exists
		const client = await clientRepository.findById(clientId);
		if (!client) {
			throw new NotFoundError('Client not found');
		}

		// Consider checking if client has active orders before deletion
		// or implement soft delete

		return clientRepository.delete(clientId);
	}

	/**
	 * Add delivery location to client
	 * @param {string} clientId - Client ID
	 * @param {Object} locationData - Location data
	 * @returns {Object} Updated client
	 */
	async addClientDeliveryLocation(clientId, locationData) {
		const client = await clientRepository.findById(clientId);
		if (!client) {
			throw new NotFoundError('Client not found');
		}

		// Convert to Client domain model if it's not already
		const clientModel = client instanceof Client ? client : new Client(client);

		// Add delivery location
		clientModel.addDeliveryLocation(locationData);

		// Save updated client
		return clientRepository.update(clientId, clientModel);
	}

	/**
	 * Remove delivery location from client
	 * @param {string} clientId - Client ID
	 * @param {string} locationId - Location ID
	 * @returns {Object} Updated client
	 */
	async removeClientDeliveryLocation(clientId, locationId) {
		const client = await clientRepository.findById(clientId);
		if (!client) {
			throw new NotFoundError('Client not found');
		}

		// Convert to Client domain model if it's not already
		const clientModel = client instanceof Client ? client : new Client(client);

		// Remove delivery location
		const removed = clientModel.removeDeliveryLocation(locationId);
		if (!removed) {
			throw new NotFoundError('Delivery location not found');
		}

		// Save updated client
		return clientRepository.update(clientId, clientModel);
	}

	/**
	 * Add note to client
	 * @param {string} clientId - Client ID
	 * @param {string} note - Note text
	 * @returns {Object} Updated client
	 */
	async addClientNote(clientId, note) {
		const client = await clientRepository.findById(clientId);
		if (!client) {
			throw new NotFoundError('Client not found');
		}

		// Convert to Client domain model if it's not already
		const clientModel = client instanceof Client ? client : new Client(client);

		// Add note
		clientModel.addNote(note);

		// Save updated client
		return clientRepository.update(clientId, clientModel);
	}

	/**
	 * Update client preferences
	 * @param {string} clientId - Client ID
	 * @param {string} key - Preference key
	 * @param {*} value - Preference value
	 * @returns {Object} Updated client
	 */
	async updateClientPreference(clientId, key, value) {
		const client = await clientRepository.findById(clientId);
		if (!client) {
			throw new NotFoundError('Client not found');
		}

		// Convert to Client domain model if it's not already
		const clientModel = client instanceof Client ? client : new Client(client);

		// Update preference
		clientModel.updatePreference(key, value);

		// Save updated client
		return clientRepository.update(clientId, clientModel);
	}

	/**
	 * Get client order history
	 * @param {string} clientId - Client ID
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Array} Client orders
	 */
	async getClientOrderHistory(clientId, options = {}) {
		// Check if client exists
		const client = await clientRepository.findById(clientId);
		if (!client) {
			throw new NotFoundError('Client not found');
		}

		const orderRepository = require('../data/repositories/order.repository');
		return orderRepository.findByClientId(clientId, options);
	}

	/**
	 * Search clients
	 * @param {string} query - Search query
	 * @param {Object} options - Search options
	 * @returns {Array} Matching clients
	 */
	async searchClients(query, options = {}) {
		return clientRepository.search(query, options);
	}
}

module.exports = new ClientService();