
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
	constructor(logger) {
		super(orderSchema, logger);
		this.logger.info('OrderRepository initialized');

	}

	/**
	 * Get orders with pagination and filtering
	 * @param {Object} options - Query options including filters
	 * @returns {Promise<Object>} Paginated orders
	 * @throws {DatabaseError} Database error
	 */
	async getOrders(options = {}) {
		try {
			const {
				page = 1,
				limit = 10,
				sort = '-createdAt',
				status,
				clientId,
				fromDate,
				toDate
			} = options;

			// Build filter query
			const filter = {};

			if (status) {
				filter.status = status;
			}

			if (clientId) {
				filter.clientId = clientId;
			}

			if (fromDate || toDate) {
				filter.createdAt = {};

				if (fromDate) {
					filter.createdAt.$gte = new Date(fromDate);
				}

				if (toDate) {
					filter.createdAt.$lte = new Date(toDate);
				}
			}

			// Set up pagination options
			const queryOptions = {
				sort: this._parseSortOption(sort),
				skip: (page - 1) * limit,
				limit: parseInt(limit, 10)
			};

			// Execute query and count in parallel
			const [orders, total] = await Promise.all([
				this.find(filter, queryOptions),
				this.count(filter)
			]);

			return {
				data: orders,
				pagination: {
					total,
					page: parseInt(page, 10),
					limit: parseInt(limit, 10),
					pages: Math.ceil(total / limit)
				}
			};
		} catch (error) {
			console.log(error)
			this.logger.error(`Error fetching orders: ${error.message}`);
			throw new DatabaseError(`Error fetching orders: ${error.message}`);
		}
	}

	/**
	 * Get orders by client ID
	 * @param {string} clientId - Client ID
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Paginated orders
	 * @throws {DatabaseError} Database error
	 */
	async getOrdersByClientId(clientId, options = {}) {
		try {
			return this.getOrders({ ...options, clientId });
		} catch (error) {
			this.logger.error(`Error fetching orders for client ${clientId}: ${error.message}`);
			throw new DatabaseError(`Error fetching orders for client: ${error.message}`);
		}
	}

	/**
	 * Get orders by status
	 * @param {string} status - Order status
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Paginated orders
	 * @throws {DatabaseError} Database error
	 */
	async getOrdersByStatus(status, options = {}) {
		try {
			return this.getOrders({ ...options, status });
		} catch (error) {
			this.logger.error(`Error fetching orders with status ${status}: ${error.message}`);
			throw new DatabaseError(`Error fetching orders by status: ${error.message}`);
		}
	}

	/**
	 * Get order statistics
	 * @param {Object} options - Filter options
	 * @returns {Promise<Object>} Order statistics
	 * @throws {DatabaseError} Database error
	 */
	async getOrderStats(options = {}) {
		try {
			const { fromDate, toDate } = options;

			// Build match stage
			const matchStage = {};

			if (fromDate || toDate) {
				matchStage.createdAt = {};

				if (fromDate) {
					matchStage.createdAt.$gte = new Date(fromDate);
				}

				if (toDate) {
					matchStage.createdAt.$lte = new Date(toDate);
				}
			}

			// Run aggregation for overall statistics
			const overallStats = await this.aggregate([
				{ $match: matchStage },
				{
					$group: {
						_id: null,
						totalOrders: { $sum: 1 },
						totalRevenue: { $sum: '$total' },
						averageOrderValue: { $avg: '$total' },
						minOrderValue: { $min: '$total' },
						maxOrderValue: { $max: '$total' }
					}
				}
			]);

			// Run aggregation for status breakdown
			const statusStats = await this.aggregate([
				{ $match: matchStage },
				{
					$group: {
						_id: '$status',
						count: { $sum: 1 },
						revenue: { $sum: '$total' }
					}
				},
				{ $sort: { count: -1 } }
			]);

			// Format the results
			const result = {
				overall: overallStats.length > 0 ? {
					totalOrders: overallStats[0].totalOrders,
					totalRevenue: overallStats[0].totalRevenue,
					averageOrderValue: overallStats[0].averageOrderValue,
					minOrderValue: overallStats[0].minOrderValue,
					maxOrderValue: overallStats[0].maxOrderValue
				} : {
					totalOrders: 0,
					totalRevenue: 0,
					averageOrderValue: 0,
					minOrderValue: 0,
					maxOrderValue: 0
				},
				byStatus: statusStats.reduce((acc, stat) => {
					acc[stat._id] = {
						count: stat.count,
						revenue: stat.revenue
					};
					return acc;
				}, {})
			};

			return result;
		} catch (error) {
			this.logger.error(`Error calculating order statistics: ${error.message}`);
			throw new DatabaseError(`Error calculating order statistics: ${error.message}`);
		}
	}

	/**
	 * Helper method to parse sort option
	 * @param {string} sortOption - Sort option string (e.g., '-createdAt,+name')
	 * @returns {Object} MongoDB sort object
	 * @private
	 */
	_parseSortOption(sortOption) {
		if (!sortOption) return { createdAt: -1 };

		const sortFields = sortOption.split(',');
		const sortObject = {};

		sortFields.forEach(field => {
			if (field.startsWith('-')) {
				sortObject[field.substring(1)] = -1;
			} else if (field.startsWith('+')) {
				sortObject[field.substring(1)] = 1;
			} else {
				sortObject[field] = 1;
			}
		});

		return sortObject;
	}
}

module.exports = new OrderRepository();