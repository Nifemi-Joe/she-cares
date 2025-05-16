// src/data/repositories/client.repository.js

const BaseRepository = require('./base.repository');
const ClientSchema = require('../schemas/client.schema');
const Client = require('../../domain/models/client.model');
const { DatabaseError } = require('../../utils/error-handler');

/**
 * @class ClientRepository
 * @extends BaseRepository
 * @description Repository for client data operations
 * @since v1.2.0 (2023)
 * @author SheCares Development Team
 */
class ClientRepository extends BaseRepository {
	/**
	 * Initialize client repository
	 */
	constructor() {
		super('clients', ClientSchema);
	}

	/**
	 * Find client by email
	 * @param {string} email - Client email address
	 * @returns {Promise<Client|null>} Client or null if not found
	 */
	async findByEmail(email) {
		try {
			if (!email) return null;

			const client = await this.collection.findOne({
				email: { $regex: new RegExp(`^${email}$`, 'i') }
			});
			return client ? this._toModel(client) : null;
		} catch (error) {
			throw new DatabaseError(`Error finding client by email: ${error.message}`);
		}
	}

	/**
	 * Find client by phone number
	 * @param {string} phone - Client phone number
	 * @returns {Promise<Client|null>} Client or null if not found
	 */
	async findByPhone(phone) {
		try {
			if (!phone) return null;

			// Remove spaces and non-numeric characters for comparison
			const normalizedPhone = phone.replace(/\D/g, '');

			// Find clients and then filter by normalized phone
			const clients = await this.collection
				.find({ phone: { $exists: true } })
				.toArray();

			// Check each client's phone number after normalizing
			const matchingClient = clients.find(client => {
				const clientNormalizedPhone = client.phone.replace(/\D/g, '');
				return clientNormalizedPhone === normalizedPhone;
			});

			return matchingClient ? this._toModel(matchingClient) : null;
		} catch (error) {
			throw new DatabaseError(`Error finding client by phone: ${error.message}`);
		}
	}

	/**
	 * Search clients
	 * @param {string} query - Search query
	 * @param {Object} options - Search options
	 * @returns {Promise<Array<Client>>} List of matching clients
	 */
	async search(query, options = {}) {
		try {
			const searchQuery = {
				$or: [
					{ name: { $regex: query, $options: 'i' } },
					{ email: { $regex: query, $options: 'i' } },
					{ phone: { $regex: query, $options: 'i' } },
					{ notes: { $regex: query, $options: 'i' } },
					{ 'address.street': { $regex: query, $options: 'i' } },
					{ 'address.city': { $regex: query, $options: 'i' } }
				]
			};

			// Handle pagination
			const limit = options.limit || 20;
			const skip = options.skip || 0;

			// Handle sorting
			const sort = options.sort || { name: 1 };

			const clients = await this.collection
				.find(searchQuery)
				.sort(sort)
				.skip(skip)
				.limit(limit)
				.toArray();

			return clients.map(client => this._toModel(client));
		} catch (error) {
			throw new DatabaseError(`Error searching clients: ${error.message}`);
		}
	}

	/**
	 * Find top clients by order count or amount spent
	 * @param {Object} options - Query options
	 * @param {number} options.limit - Number of clients to return
	 * @param {string} options.sortBy - Field to sort by ('totalOrders' or 'totalSpent')
	 * @returns {Promise<Array<Client>>} List of top clients
	 */
	async findTopClients(options = {}) {
		try {
			const limit = options.limit || 10;
			const sortBy = options.sortBy || 'totalOrders';

			const sortField = sortBy === 'totalSpent' ? 'totalSpent' : 'totalOrders';

			const clients = await this.collection
				.find()
				.sort({ [sortField]: -1 })
				.limit(limit)
				.toArray();

			return clients.map(client => this._toModel(client));
		} catch (error) {
			throw new DatabaseError(`Error finding top clients: ${error.message}`);
		}
	}

	/**
	 * Find recent clients
	 * @param {number} limit - Number of clients to return
	 * @returns {Promise<Array<Client>>} List of recent clients
	 */
	async findRecentClients(limit = 10) {
		try {
			const clients = await this.collection
				.find()
				.sort({ createdAt: -1 })
				.limit(limit)
				.toArray();

			return clients.map(client => this._toModel(client));
		} catch (error) {
			throw new DatabaseError(`Error finding recent clients: ${error.message}`);
		}
	}

	/**
	 * Get client statistics
	 * @returns {Promise<Object>} Client statistics
	 */
	async getStats() {
		try {
			const stats = await this.collection.aggregate([
				{
					$group: {
						_id: null,
						totalClients: { $sum: 1 },
						totalOrders: { $sum: "$totalOrders" },
						totalRevenue: { $sum: "$totalSpent" },
						averageOrderValue: {
							$avg: {
								$cond: [
									{ $gt: ["$totalOrders", 0] },
									{ $divide: ["$totalSpent", "$totalOrders"] },
									0
								]
							}
						}
					}
				}
			]).toArray();

			return stats[0] || {
				totalClients: 0,
				totalOrders: 0,
				totalRevenue: 0,
				averageOrderValue: 0
			};
		} catch (error) {
			throw new DatabaseError(`Error getting client stats: ${error.message}`);
		}
	}

	/**
	 * Update client order statistics
	 * @param {string} clientId - Client ID
	 * @param {number} orderAmount - Amount of new order
	 * @returns {Promise<Client>} Updated client
	 */
	async updateOrderStats(clientId, orderAmount) {
		try {
			const result = await this.collection.findOneAndUpdate(
				{ _id: this._objectId(clientId) },
				{
					$inc: {
						totalOrders: 1,
						totalSpent: orderAmount
					},
					$set: {
						lastOrderDate: new Date(),
						updatedAt: new Date()
					}
				},
				{ returnDocument: 'after' }
			);

			if (!result) {
				throw new Error('Client not found');
			}

			return this._toModel(result);
		} catch (error) {
			throw new DatabaseError(`Error updating client order stats: ${error.message}`);
		}
	}

	/**
	 * Convert database object to domain model
	 * @param {Object} dbObject - Database object
	 * @returns {Client} Client domain model
	 * @protected
	 */
	_toModel(dbObject) {
		return new Client({
			id: dbObject._id.toString(),
			name: dbObject.name,
			email: dbObject.email,
			phone: dbObject.phone,
			address: dbObject.address,
			deliveryLocations: dbObject.deliveryLocations || [],
			preferredContactMethod: dbObject.preferredContactMethod,
			preferences: dbObject.preferences || {},
			notes: dbObject.notes,
			lastOrderDate: dbObject.lastOrderDate,
			totalOrders: dbObject.totalOrders || 0,
			totalSpent: dbObject.totalSpent || 0,
			createdAt: dbObject.createdAt,
			updatedAt: dbObject.updatedAt
		});
	}

	/**
	 * Convert domain model to database object
	 * @param {Client} model - Client domain model
	 * @returns {Object} Database object
	 * @protected
	 */
	_toDbObject(model) {
		const { id, ...dbObject } = model;

		// Don't overwrite _id if it exists in model (for updates)
		if (model._id) {
			dbObject._id = model._id;
		}

		return dbObject;
	}
}

module.exports = new ClientRepository();