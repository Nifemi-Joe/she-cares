// src/data/repositories/order.repository.js

const BaseRepository = require('./base.repository');
const orderSchema = require('../schemas/order.schema');
const Order = require('../../domain/models/order.model');
const { DatabaseError } = require('../../utils/error-handler');
const mongodb = require('../../infrastructure/database/mongodb');

/**
 * @class OrderRepository
 * @description Repository for managing order data persistence
 * @extends BaseRepository
 */
class OrderRepository extends BaseRepository {
	constructor() {
		super('orders', Order);
	}

	/**
	 * Find orders by client ID
	 * @param {string} clientId - Client ID
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of orders
	 */
	async findByClientId(clientId, options = {}) {
		try {
			const { skip, limit, sort } = this._parsePaginationOptions(options);

			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			const query = { clientId };
			const cursor = collection
				.find(query)
				.skip(skip)
				.limit(limit);

			if (sort) {
				cursor.sort(sort);
			}

			const orders = await cursor.toArray();
			return orders.map(order => this._toModel(order));
		} catch (error) {
			throw new DatabaseError(`Error finding orders by client ID: ${error.message}`);
		}
	}

	/**
	 * Find orders by status
	 * @param {string} status - Order status
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of orders
	 */
	async findByStatus(status, options = {}) {
		try {
			const { skip, limit, sort } = this._parsePaginationOptions(options);

			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			const query = { status };
			const cursor = collection
				.find(query)
				.skip(skip)
				.limit(limit);

			if (sort) {
				cursor.sort(sort);
			}

			const orders = await cursor.toArray();
			return orders.map(order => this._toModel(order));
		} catch (error) {
			throw new DatabaseError(`Error finding orders by status: ${error.message}`);
		}
	}

	/**
	 * Find orders containing a specific product
	 * @param {string} productId - Product ID
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of orders
	 */
	async findByProductId(productId, options = {}) {
		try {
			const { skip, limit, sort } = this._parsePaginationOptions(options);

			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			const query = { 'items.productId': productId };
			const cursor = collection
				.find(query)
				.skip(skip)
				.limit(limit);

			if (sort) {
				cursor.sort(sort);
			}

			const orders = await cursor.toArray();
			return orders.map(order => this._toModel(order));
		} catch (error) {
			throw new DatabaseError(`Error finding orders by product ID: ${error.message}`);
		}
	}

	/**
	 * Find orders between date range
	 * @param {Date} startDate - Start date
	 * @param {Date} endDate - End date
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of orders
	 */
	async findByDateRange(startDate, endDate, options = {}) {
		try {
			const { skip, limit, sort } = this._parsePaginationOptions(options);

			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			const query = {
				createdAt: {
					$gte: new Date(startDate),
					$lte: new Date(endDate)
				}
			};

			const cursor = collection
				.find(query)
				.skip(skip)
				.limit(limit);

			if (sort) {
				cursor.sort(sort);
			}

			const orders = await cursor.toArray();
			return orders.map(order => this._toModel(order));
		} catch (error) {
			throw new DatabaseError(`Error finding orders by date range: ${error.message}`);
		}
	}

	/**
	 * Get order statistics
	 * @param {Object} options - Filter options (date range, etc.)
	 * @returns {Promise<Object>} Order statistics
	 */
	async getStats(options = {}) {
		try {
			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			// Basic query for filtering
			const query = {};

			// Add date range if specified
			if (options.startDate && options.endDate) {
				query.createdAt = {
					$gte: new Date(options.startDate),
					$lte: new Date(options.endDate)
				};
			}

			// Run aggregation pipeline
			const pipeline = [
				{ $match: query },
				{
					$group: {
						_id: null,
						totalOrders: { $sum: 1 },
						totalSales: { $sum: '$totalAmount' },
						avgOrderValue: { $avg: '$totalAmount' },
						completedOrders: {
							$sum: {
								$cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
							}
						},
						pendingOrders: {
							$sum: {
								$cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
							}
						},
						cancelledOrders: {
							$sum: {
								$cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
							}
						}
					}
				}
			];

			// Add status distribution by product category if requested
			if (options.includeCategories) {
				// This would require more complex aggregation with lookups
				// to products and categories collections
			}

			const result = await collection.aggregate(pipeline).toArray();
			return result[0] || {
				totalOrders: 0,
				totalSales: 0,
				avgOrderValue: 0,
				completedOrders: 0,
				pendingOrders: 0,
				cancelledOrders: 0
			};
		} catch (error) {
			throw new DatabaseError(`Error getting order statistics: ${error.message}`);
		}
	}

	/**
	 * Update order status
	 * @param {string} orderId - Order ID
	 * @param {string} status - New status
	 * @returns {Promise<Object>} Updated order
	 */
	async updateStatus(orderId, status) {
		try {
			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			const result = await collection.findOneAndUpdate(
				{ _id: this._toObjectId(orderId) },
				{
					$set: {
						status,
						updatedAt: new Date()
					}
				},
				{ returnDocument: 'after' }
			);

			if (!result.value) {
				return null;
			}

			return this._toModel(result.value);
		} catch (error) {
			throw new DatabaseError(`Error updating order status: ${error.message}`);
		}
	}

	/**
	 * Validate order data against schema
	 * @param {Object} data - Order data to validate
	 * @returns {Object} Validated data
	 * @protected
	 */
	_validateSchema(data) {
		return orderSchema.validate(data);
	}
}

module.exports = new OrderRepository();