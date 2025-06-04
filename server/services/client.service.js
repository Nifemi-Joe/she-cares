/**
 * @class ClientService
 * @description Service layer for client operations
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */
class ClientService {
	/**
	 * Create a new ClientService instance
	 * @param {Object} clientRepository - Client repository instance
	 * @param {Object} orderRepository - Order repository for client analytics
	 * @param {Object} eventDispatcher - Event dispatcher for domain events
	 * @param {Object} logger - Logger instance
	 */
	constructor(clientRepository, orderRepository, eventDispatcher, logger) {
		this.clientRepository = clientRepository;
		this.orderRepository = orderRepository;
		this.eventDispatcher = eventDispatcher;
		this.logger = logger;
	}

	/**
	 * Get client statistics for dashboard
	 * @param {Object} filters - Optional filter criteria
	 * @returns {Promise<Object>} Client statistics
	 * @throws {Error} Database error
	 */
	async getStats(filters = {}) {
		try {
			// Build filter query
			const filterQuery = {};

			if (filters.isActive !== undefined) {
				filterQuery.isActive = filters.isActive;
			}

			if (filters.registeredAfter) {
				filterQuery.createdAt = { $gte: new Date(filters.registeredAfter) };
			}

			if (filters.registeredBefore) {
				filterQuery.createdAt = {
					...filterQuery.createdAt,
					$lte: new Date(filters.registeredBefore)
				};
			}

			// Get basic counts
			const [
				totalClients,
				activeClients,
				inactiveClients,
				newClientsThisMonth
			] = await Promise.all([
				this.clientRepository.count(filterQuery),
				this.clientRepository.count({ ...filterQuery, isActive: true }),
				this.clientRepository.count({ ...filterQuery, isActive: false }),
				this.clientRepository.count({
					...filterQuery,
					createdAt: {
						$gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
					}
				})
			]);

			// Get client value statistics (based on their orders)
			const clientValueStats = await this.clientRepository.aggregate([
				{ $match: filterQuery },
				{ $lookup: {
						from: 'orders',
						localField: '_id',
						foreignField: 'clientId',
						as: 'orders'
					}},
				{ $addFields: {
						totalSpent: {
							$sum: {
								$map: {
									input: { $filter: {
											input: '$orders',
											cond: { $ne: ['$$this.status', 'cancelled'] }
										}},
									as: 'order',
									in: '$$order.total'
								}
							}
						},
						orderCount: {
							$size: {
								$filter: {
									input: '$orders',
									cond: { $ne: ['$$this.status', 'cancelled'] }
								}
							}
						}
					}},
				{ $group: {
						_id: null,
						avgClientValue: { $avg: '$totalSpent' },
						maxClientValue: { $max: '$totalSpent' },
						avgOrdersPerClient: { $avg: '$orderCount' },
						clientsWithOrders: {
							$sum: { $cond: [{ $gt: ['$orderCount', 0] }, 1, 0] }
						}
					}}
			]);

			// Get top clients by spending
			const topClients = await this.clientRepository.aggregate([
				{ $match: filterQuery },
				{ $lookup: {
						from: 'orders',
						localField: '_id',
						foreignField: 'clientId',
						as: 'orders'
					}},
				{ $addFields: {
						totalSpent: {
							$sum: {
								$map: {
									input: { $filter: {
											input: '$orders',
											cond: { $ne: ['$$this.status', 'cancelled'] }
										}},
									as: 'order',
									in: '$$order.total'
								}
							}
						}
					}},
				{ $sort: { totalSpent: -1 } },
				{ $limit: 5 },
				{ $project: {
						name: 1,
						email: 1,
						totalSpent: 1,
						phone: 1
					}}
			]);

			// Get registration trend (last 12 months)
			const registrationTrend = await this.clientRepository.aggregate([
				{ $match: {
						...filterQuery,
						createdAt: {
							$gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)
						}
					}},
				{ $group: {
						_id: {
							year: { $year: '$createdAt' },
							month: { $month: '$createdAt' }
						},
						count: { $sum: 1 }
					}},
				{ $sort: { '_id.year': 1, '_id.month': 1 } }
			]);

			const stats = clientValueStats[0] || {
				avgClientValue: 0,
				maxClientValue: 0,
				avgOrdersPerClient: 0,
				clientsWithOrders: 0
			};

			return {
				totalClients,
				activeClients,
				inactiveClients,
				newClientsThisMonth,
				clientsWithoutOrders: totalClients - stats.clientsWithOrders,
				...stats,
				topClients,
				registrationTrend: registrationTrend.map(item => ({
					month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
					count: item.count
				}))
			};
		} catch (error) {
			this.logger.error(`Error calculating client statistics: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get client by ID
	 * @param {string} clientId - Client ID
	 * @returns {Promise<Object>} Client data
	 * @throws {Error} Not found or database error
	 */
	async getClientById(clientId) {
		try {
			const client = await this.clientRepository.findById(clientId);

			if (!client) {
				throw new Error(`Client with ID ${clientId} not found`);
			}

			return client;
		} catch (error) {
			this.logger.error(`Error fetching client ${clientId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Create a new client
	 * @param {Object} clientData - Client data
	 * @returns {Promise<Object>} Created client
	 * @throws {Error} Validation or database error
	 */
	async createClient(clientData) {
		try {
			// Create client ID if not provided
			if (!clientData.id) {
				clientData.id = `client_${Date.now()}`;
			}

			// Create client domain model (if you have one)
			// const Client = require('../domain/models/client.model');
			// const client = new Client(clientData);

			// For now, save directly
			const savedClient = await this.clientRepository.create(clientData);

			// Dispatch event
			this.eventDispatcher.dispatch('client:created', {
				clientId: savedClient.id,
				email: savedClient.email,
				timestamp: new Date()
			});

			return savedClient;
		} catch (error) {
			this.logger.error(`Error creating client: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Update a client
	 * @param {string} clientId - Client ID
	 * @param {Object} updateData - Updated client data
	 * @returns {Promise<Object>} Updated client
	 * @throws {Error} Not found or database error
	 */
	async updateClient(clientId, updateData) {
		try {
			// Verify client exists
			const existingClient = await this.clientRepository.findById(clientId);
			if (!existingClient) {
				throw new Error(`Client with ID ${clientId} not found`);
			}

			// Update timestamp
			updateData.updatedAt = new Date();

			// Update client
			const updatedClient = await this.clientRepository.update(clientId, updateData);

			// Dispatch event
			this.eventDispatcher.dispatch('client:updated', {
				clientId: updatedClient.id,
				updatedFields: Object.keys(updateData),
				timestamp: new Date()
			});

			return updatedClient;
		} catch (error) {
			this.logger.error(`Error updating client ${clientId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get all clients with filtering and pagination
	 * @param {Object} filters - Filter criteria
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Paginated clients
	 * @throws {Error} Database error
	 */
	async getClients(filters = {}, options = {}) {
		try {
			// Build filter object
			const filterQuery = {};

			if (filters.isActive !== undefined) {
				filterQuery.isActive = filters.isActive;
			}

			if (filters.search) {
				filterQuery.$or = [
					{ name: { $regex: filters.search, $options: 'i' } },
					{ email: { $regex: filters.search, $options: 'i' } },
					{ phone: { $regex: filters.search, $options: 'i' } }
				];
			}

			// Set up pagination options
			const queryOptions = {
				sort: options.sort || { createdAt: -1 },
				skip: options.page > 0 ? (options.page - 1) * (options.limit || 10) : 0,
				limit: options.limit || 10
			};

			// Get data
			const [clients, total] = await Promise.all([
				this.clientRepository.find(filterQuery, queryOptions),
				this.clientRepository.count(filterQuery)
			]);

			return {
				data: clients,
				pagination: {
					total,
					page: options.page || 1,
					limit: options.limit || 10,
					pages: Math.ceil(total / (options.limit || 10))
				}
			};
		} catch (error) {
			this.logger.error(`Error fetching clients: ${error.message}`);
			throw error;
		}
	}

	// Add these methods to your ClientService class (client.service.js)

	/**
	 * Delete a client
	 * @param {string} clientId - Client ID
	 * @returns {Promise<void>}
	 * @throws {Error} Not found or database error
	 */
	async deleteClient(clientId) {
		try {
			// Verify client exists
			const existingClient = await this.clientRepository.findById(clientId);
			if (!existingClient) {
				throw new Error(`Client with ID ${clientId} not found`);
			}

			// Delete client
			await this.clientRepository.delete(clientId);

			// Dispatch event
			this.eventDispatcher.dispatch('client:deleted', {
				clientId: clientId,
				timestamp: new Date()
			});

			this.logger.info(`Client ${clientId} deleted successfully`);
		} catch (error) {
			this.logger.error(`Error deleting client ${clientId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Add delivery location to client
	 * @param {string} clientId - Client ID
	 * @param {Object} locationData - Location data
	 * @returns {Promise<Object>} Updated client
	 * @throws {Error} Not found or database error
	 */
	async addClientDeliveryLocation(clientId, locationData) {
		try {
			// Verify client exists
			const existingClient = await this.clientRepository.findById(clientId);
			if (!existingClient) {
				throw new Error(`Client with ID ${clientId} not found`);
			}

			// Add location ID if not provided
			if (!locationData.id) {
				locationData.id = `loc_${Date.now()}`;
			}

			// Add timestamp
			locationData.createdAt = new Date();

			// Add location to client's delivery locations array
			const updateData = {
				$push: { deliveryLocations: locationData },
				updatedAt: new Date()
			};

			const updatedClient = await this.clientRepository.update(clientId, updateData);

			// Dispatch event
			this.eventDispatcher.dispatch('client:location_added', {
				clientId: clientId,
				locationId: locationData.id,
				timestamp: new Date()
			});

			return updatedClient;
		} catch (error) {
			this.logger.error(`Error adding delivery location to client ${clientId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Remove delivery location from client
	 * @param {string} clientId - Client ID
	 * @param {string} locationId - Location ID
	 * @returns {Promise<Object>} Updated client
	 * @throws {Error} Not found or database error
	 */
	async removeClientDeliveryLocation(clientId, locationId) {
		try {
			// Verify client exists
			const existingClient = await this.clientRepository.findById(clientId);
			if (!existingClient) {
				throw new Error(`Client with ID ${clientId} not found`);
			}

			// Remove location from client's delivery locations array
			const updateData = {
				$pull: { deliveryLocations: { id: locationId } },
				updatedAt: new Date()
			};

			const updatedClient = await this.clientRepository.update(clientId, updateData);

			// Dispatch event
			this.eventDispatcher.dispatch('client:location_removed', {
				clientId: clientId,
				locationId: locationId,
				timestamp: new Date()
			});

			return updatedClient;
		} catch (error) {
			this.logger.error(`Error removing delivery location from client ${clientId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Check if client exists by email and return their ID
	 * @param {string} email - Client email address
	 * @returns {Promise<Object|null>} Object with client ID if found, null otherwise
	 * @throws {Error} Database error
	 */
	async checkClientByEmail(email) {
		try {
			if (!email) {
				throw new Error('Email is required');
			}

			const client = await this.clientRepository.findByEmail(email);

			if (!client) {
				return null;
			}

			return {
				id: client.id,
				exists: true
			};
		} catch (error) {
			this.logger.error(`Error checking client by email ${email}: ${error.message}`);
			throw error;
		}
	}


	/**
	 * Add note to client
	 * @param {string} clientId - Client ID
	 * @param {string} noteText - Note text
	 * @returns {Promise<Object>} Updated client
	 * @throws {Error} Not found or database error
	 */
	async addClientNote(clientId, noteText) {
		try {
			// Verify client exists
			const existingClient = await this.clientRepository.findById(clientId);
			if (!existingClient) {
				throw new Error(`Client with ID ${clientId} not found`);
			}

			// Create note object
			const note = {
				id: `note_${Date.now()}`,
				text: noteText,
				createdAt: new Date()
			};

			// Add note to client's notes array
			const updateData = {
				$push: { notes: note },
				updatedAt: new Date()
			};

			const updatedClient = await this.clientRepository.update(clientId, updateData);

			// Dispatch event
			this.eventDispatcher.dispatch('client:note_added', {
				clientId: clientId,
				noteId: note.id,
				timestamp: new Date()
			});

			return updatedClient;
		} catch (error) {
			this.logger.error(`Error adding note to client ${clientId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Update client preference
	 * @param {string} clientId - Client ID
	 * @param {string} key - Preference key
	 * @param {*} value - Preference value
	 * @returns {Promise<Object>} Updated client
	 * @throws {Error} Not found or database error
	 */
	async updateClientPreference(clientId, key, value) {
		try {
			// Verify client exists
			const existingClient = await this.clientRepository.findById(clientId);
			if (!existingClient) {
				throw new Error(`Client with ID ${clientId} not found`);
			}

			// Update preference
			const updateData = {
				[`preferences.${key}`]: value,
				updatedAt: new Date()
			};

			const updatedClient = await this.clientRepository.update(clientId, updateData);

			// Dispatch event
			this.eventDispatcher.dispatch('client:preference_updated', {
				clientId: clientId,
				preferenceKey: key,
				timestamp: new Date()
			});

			return updatedClient;
		} catch (error) {
			this.logger.error(`Error updating preference for client ${clientId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get client order history
	 * @param {string} clientId - Client ID
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Paginated orders
	 * @throws {Error} Not found or database error
	 */
	async getClientOrderHistory(clientId, options = {}) {
		try {
			// Verify client exists
			const existingClient = await this.clientRepository.findById(clientId);
			if (!existingClient) {
				throw new Error(`Client with ID ${clientId} not found`);
			}

			// Set up pagination options
			const queryOptions = {
				sort: { [options.sort || 'createdAt']: options.order === 'asc' ? 1 : -1 },
				skip: options.page > 0 ? (options.page - 1) * (options.limit || 10) : 0,
				limit: options.limit || 10
			};

			// Get orders for this client
			const [orders, total] = await Promise.all([
				this.orderRepository.find({ clientId: clientId }, queryOptions),
				this.orderRepository.count({ clientId: clientId })
			]);

			return {
				items: orders,
				total,
				page: options.page || 1,
				limit: options.limit || 10,
				pages: Math.ceil(total / (options.limit || 10))
			};
		} catch (error) {
			this.logger.error(`Error fetching order history for client ${clientId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Search clients by name, email, or phone
	 * @param {string} query - Search query
	 * @returns {Promise<Array>} Matching clients
	 * @throws {Error} Database error
	 */
	async searchClients(query) {
		try {
			const searchRegex = { $regex: query, $options: 'i' };

			const filterQuery = {
				$or: [
					{ name: searchRegex },
					{ email: searchRegex },
					{ phone: searchRegex }
				]
			};

			const clients = await this.clientRepository.find(filterQuery, {
				limit: 20,
				sort: { name: 1 }
			});

			return clients;
		} catch (error) {
			this.logger.error(`Error searching clients: ${error.message}`);
			throw error;
		}
	}
}

module.exports = ClientService;