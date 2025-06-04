// src/data/repositories/delivery.repository.js

const BaseRepository = require('./base.repository');
const deliverySchema = require('../schemas/delivery.schema');
const { DatabaseError } = require('../../utils/error-handler');
const mongodb = require('../../infrastructure/database/mongodb');

/**
 * @class DeliveryRepository
 * @description Repository for managing delivery data persistence
 * @extends BaseRepository
 */
class DeliveryRepository extends BaseRepository {
	constructor() {
		super(deliverySchema);
	}

	/**
	 * Find deliveries by order ID
	 * @param {string} orderId - Order ID
	 * @returns {Promise<Array>} List of deliveries
	 */
	async findByOrderId(orderId) {
		try {
			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			const query = { orderId };
			const deliveries = await collection.find(query).toArray();

			return deliveries.map(delivery => this._toModel(delivery));
		} catch (error) {
			throw new DatabaseError(`Error finding deliveries by order ID: ${error.message}`);
		}
	}

	/**
	 * Find deliveries by client ID
	 * @param {string} clientId - Client ID
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of deliveries
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

			const deliveries = await cursor.toArray();
			return deliveries.map(delivery => this._toModel(delivery));
		} catch (error) {
			throw new DatabaseError(`Error finding deliveries by client ID: ${error.message}`);
		}
	}

	/**
	 * Find deliveries by status
	 * @param {string} status - Delivery status
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of deliveries
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

			const deliveries = await cursor.toArray();
			return deliveries.map(delivery => this._toModel(delivery));
		} catch (error) {
			throw new DatabaseError(`Error finding deliveries by status: ${error.message}`);
		}
	}

	/**
	 * Find deliveries scheduled for a specific date
	 * @param {Date} date - Delivery date
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of deliveries
	 */
	async findByDate(date, options = {}) {
		try {
			const { skip, limit, sort } = this._parsePaginationOptions(options);

			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			// Create start and end of the day for date comparison
			const startDate = new Date(date);
			startDate.setHours(0, 0, 0, 0);

			const endDate = new Date(date);
			endDate.setHours(23, 59, 59, 999);

			const query = {
				scheduledDate: {
					$gte: startDate,
					$lte: endDate
				}
			};

			const cursor = collection
				.find(query)
				.skip(skip)
				.limit(limit);

			if (sort) {
				cursor.sort(sort);
			}

			const deliveries = await cursor.toArray();
			return deliveries.map(delivery => this._toModel(delivery));
		} catch (error) {
			throw new DatabaseError(`Error finding deliveries by date: ${error.message}`);
		}
	}

	/**
	 * Find deliveries assigned to a specific driver
	 * @param {string} driverId - Driver ID
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of deliveries
	 */
	async findByDriverId(driverId, options = {}) {
		try {
			const { skip, limit, sort } = this._parsePaginationOptions(options);

			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			const query = { driverId };
			const cursor = collection
				.find(query)
				.skip(skip)
				.limit(limit);

			if (sort) {
				cursor.sort(sort);
			}

			const deliveries = await cursor.toArray();
			return deliveries.map(delivery => this._toModel(delivery));
		} catch (error) {
			throw new DatabaseError(`Error finding deliveries by driver ID: ${error.message}`);
		}
	}

	/**
	 * Update delivery status
	 * @param {string} deliveryId - Delivery ID
	 * @param {string} status - New status
	 * @param {Object} statusData - Additional status data (timestamp, notes, etc.)
	 * @returns {Promise<Object>} Updated delivery
	 */
	async updateStatus(deliveryId, status, statusData = {}) {
		try {
			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			const statusUpdate = {
				status,
				timestamp: new Date(),
				...statusData
			};

			const result = await collection.findOneAndUpdate(
				{ _id: this._toObjectId(deliveryId) },
				{
					$set: {
						status,
						updatedAt: new Date()
					},
					$push: {
						statusHistory: statusUpdate
					}
				},
				{ returnDocument: 'after' }
			);

			if (!result.value) {
				return null;
			}

			return this._toModel(result.value);
		} catch (error) {
			throw new DatabaseError(`Error updating delivery status: ${error.message}`);
		}
	}

	/**
	 * Assign driver to delivery
	 * @param {string} deliveryId - Delivery ID
	 * @param {string} driverId - Driver ID
	 * @returns {Promise<Object>} Updated delivery
	 */
	async assignDriver(deliveryId, driverId) {
		try {
			const db = await mongodb.getDb();
			const collection = db.collection(this.collectionName);

			const result = await collection.findOneAndUpdate(
				{ _id: this._toObjectId(deliveryId) },
				{
					$set: {
						driverId,
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
			throw new DatabaseError(`Error assigning driver to delivery: ${error.message}`);
		}
	}

	/**
	 * Get delivery statistics
	 * @param {Object} options - Filter options (date range, etc.)
	 * @returns {Promise<Object>} Delivery statistics
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
						totalDeliveries: { $sum: 1 },
						completedDeliveries: {
							$sum: {
								$cond: [{ $eq: ['$status', 'delivered'] }, 1, 0]
							}
						},
						pendingDeliveries: {
							$sum: {
								$cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
							}
						},
						inTransitDeliveries: {
							$sum: {
								$cond: [{ $eq: ['$status', 'in_transit'] }, 1, 0]
							}
						},
						failedDeliveries: {
							$sum: {
								$cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
							}
						}
					}
				}
			];

			const result = await collection.aggregate(pipeline).toArray();
			return result[0] || {
				totalDeliveries: 0,
				completedDeliveries: 0,
				pendingDeliveries: 0,
				inTransitDeliveries: 0,
				failedDeliveries: 0
			};
		} catch (error) {
			throw new DatabaseError(`Error getting delivery statistics: ${error.message}`);
		}
	}

	/**
	 * Validate delivery data against schema
	 * @param {Object} data - Delivery data to validate
	 * @returns {Object} Validated data
	 * @protected
	 */
	_validateSchema(data) {
		return deliverySchema.validate(data);
	}
}

module.exports = new DeliveryRepository();