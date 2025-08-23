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
	 * Get orders with pagination and filtering (Updated with search support)
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
				toDate,
				search,
				deliveryMethod,
				paymentStatus,
				minTotal,
				maxTotal,
				deliveryFeePending,
				$or,
				$and,
				createdAt,
				totalAmount,
				...filters
			} = options;

			// Build filter query
			const filter = { ...filters };

			// Handle basic filters
			if (status) {
				filter.status = status;
			}

			if (clientId) {
				filter.clientId = clientId;
			}

			if (deliveryMethod) {
				filter.shippingMethod = deliveryMethod;
			}

			if (paymentStatus) {
				filter.paymentStatus = paymentStatus;
			}

			if (deliveryFeePending !== undefined) {
				filter.deliveryFeePending = deliveryFeePending;
			}

			// Handle date range filters
			if (fromDate || toDate || createdAt) {
				if (createdAt) {
					filter.createdAt = createdAt;
				} else {
					filter.createdAt = {};

					if (fromDate) {
						filter.createdAt.$gte = new Date(fromDate);
					}

					if (toDate) {
						filter.createdAt.$lte = new Date(toDate);
					}
				}
			}

			// Handle amount range filters
			if (minTotal || maxTotal || totalAmount) {
				if (totalAmount) {
					filter.totalAmount = totalAmount;
				} else {
					const amountFilter = {};

					if (minTotal) {
						amountFilter.$gte = minTotal;
					}

					if (maxTotal) {
						amountFilter.$lte = maxTotal;
					}

					if (Object.keys(amountFilter).length > 0) {
						filter.totalAmount = amountFilter;
					}
				}
			}

			// Handle search functionality
			if (search) {
				filter.$or = [
					// Search in order number
					{ orderNumber: { $regex: search, $options: 'i' } },
					// Search in contact info name
					{ 'contactInfo.name': { $regex: search, $options: 'i' } },
					// Search in contact info email
					{ 'contactInfo.email': { $regex: search, $options: 'i' } },
					// Search in contact info phone
					{ 'contactInfo.phone': { $regex: search, $options: 'i' } },
					// Search in item names
					{ 'items.name': { $regex: search, $options: 'i' } },
					// Search in notes
					{ notes: { $regex: search, $options: 'i' } },
					// Search in delivery notes
					{ deliveryNotes: { $regex: search, $options: 'i' } }
				];

				// If search term looks like a client ID (ObjectId format), add client ID search
				if (search.match(/^[0-9a-fA-F]{24}$/)) {
					filter.$or.push({ clientId: search });
				}
			}

			// Handle complex $or conditions from service
			if ($or) {
				if (filter.$or) {
					// Combine existing $or with new one using $and
					filter.$and = [
						{ $or: filter.$or },
						{ $or: $or }
					];
					delete filter.$or;
				} else {
					filter.$or = $or;
				}
			}

			// Handle $and conditions from service
			if ($and) {
				if (filter.$and) {
					filter.$and = [...filter.$and, ...$and];
				} else {
					filter.$and = $and;
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
					pages: Math.ceil(total / limit),
					hasNext: parseInt(page, 10) < Math.ceil(total / limit),
					hasPrev: parseInt(page, 10) > 1
				}
			};
		} catch (error) {
			this.logger.error(`Error fetching orders: ${error.message}`);
			throw new DatabaseError(`Error fetching orders: ${error.message}`);
		}
	}

	/**
	 * Advanced search with client data population using aggregation
	 * @param {Object} options - Query options including filters
	 * @returns {Promise<Object>} Paginated orders with client data
	 * @throws {DatabaseError} Database error
	 */
	async getOrdersWithClientData(options = {}) {
		try {
			const {
				page = 1,
				limit = 10,
				sort = '-createdAt',
				search,
				status,
				clientId,
				fromDate,
				toDate,
				deliveryMethod,
				paymentStatus,
				...filters
			} = options;

			// Build aggregation pipeline
			const pipeline = [];

			// First match stage for basic filters
			const matchStage = { ...filters };

			if (status) matchStage.status = status;
			if (clientId) matchStage.clientId = clientId;
			if (deliveryMethod) matchStage.shippingMethod = deliveryMethod;
			if (paymentStatus) matchStage.paymentStatus = paymentStatus;

			// Handle date range
			if (fromDate || toDate) {
				matchStage.createdAt = {};
				if (fromDate) matchStage.createdAt.$gte = new Date(fromDate);
				if (toDate) matchStage.createdAt.$lte = new Date(toDate);
			}

			if (Object.keys(matchStage).length > 0) {
				pipeline.push({ $match: matchStage });
			}

			// Lookup client data from both User and Client collections
			pipeline.push(
				{
					$lookup: {
						from: 'clients',
						localField: 'clientId',
						foreignField: '_id',
						as: 'clientData'
					}
				},
				{
					$lookup: {
						from: 'users',
						localField: 'clientId',
						foreignField: '_id',
						as: 'userData'
					}
				},
				{
					$addFields: {
						populatedClient: {
							$cond: {
								if: { $gt: [{ $size: '$clientData' }, 0] },
								then: { $arrayElemAt: ['$clientData', 0] },
								else: { $arrayElemAt: ['$userData', 0] }
							}
						}
					}
				}
			);

			// Handle search after client data is populated
			if (search) {
				pipeline.push({
					$match: {
						$or: [
							{ orderNumber: { $regex: search, $options: 'i' } },
							{ 'contactInfo.name': { $regex: search, $options: 'i' } },
							{ 'contactInfo.email': { $regex: search, $options: 'i' } },
							{ 'contactInfo.phone': { $regex: search, $options: 'i' } },
							{ 'populatedClient.name': { $regex: search, $options: 'i' } },
							{ 'populatedClient.fullName': { $regex: search, $options: 'i' } },
							{ 'populatedClient.email': { $regex: search, $options: 'i' } },
							{ 'populatedClient.phone': { $regex: search, $options: 'i' } },
							{ 'items.name': { $regex: search, $options: 'i' } },
							{ notes: { $regex: search, $options: 'i' } },
							{ deliveryNotes: { $regex: search, $options: 'i' } }
						]
					}
				});
			}

			// Add sorting
			const sortObj = this._parseSortOption(sort);
			pipeline.push({ $sort: sortObj });

			// Get total count
			const countPipeline = [...pipeline, { $count: "total" }];

			// Add pagination to main pipeline
			const skip = (page - 1) * limit;
			pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

			// Execute both queries
			const [orders, countResult] = await Promise.all([
				this.aggregate(pipeline),
				this.aggregate(countPipeline)
			]);

			const total = countResult.length > 0 ? countResult[0].total : 0;
			const totalPages = Math.ceil(total / limit);

			return {
				data: orders,
				pagination: {
					total,
					page: parseInt(page, 10),
					limit: parseInt(limit, 10),
					pages: totalPages,
					hasNext: parseInt(page, 10) < totalPages,
					hasPrev: parseInt(page, 10) > 1
				}
			};

		} catch (error) {
			this.logger.error(`Error fetching orders with client data: ${error.message}`);
			throw new DatabaseError(`Error fetching orders with client data: ${error.message}`);
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
						completedOrders: {
							$sum: {
								$cond: [
									{
										$and: [
											{ $eq: ["$status", "delivered"] },
											{ $ne: ["$totalAmount", "TBD"] }
										]
									},
									1,
									0
								]
							}
						},
						pendingDeliveryFeeOrders: {
							$sum: {
								$cond: [
									{ $eq: ["$deliveryFeePending", true] },
									1,
									0
								]
							}
						},
						totalRevenue: {
							$sum: {
								$cond: [
									{
										$and: [
											{ $ne: ["$totalAmount", "TBD"] },
											{ $eq: ["$status", "delivered"] }
										]
									},
									{
										$cond: [
											{ $ifNull: ["$finalTotalAmount", false] },
											"$finalTotalAmount",
											"$totalAmount"
										]
									},
									0
								]
							}
						},
						totalSales: {
							$sum: {
								$cond: [
									{ $ne: ["$totalAmount", "TBD"] },
									{
										$cond: [
											{ $ifNull: ["$finalTotalAmount", false] },
											"$finalTotalAmount",
											"$totalAmount"
										]
									},
									0
								]
							}
						},
						averageOrderValue: {
							$avg: {
								$cond: [
									{
										$and: [
											{ $ne: ["$totalAmount", "TBD"] },
											{ $eq: ["$status", "delivered"] }
										]
									},
									{
										$cond: [
											{ $ifNull: ["$finalTotalAmount", false] },
											"$finalTotalAmount",
											"$totalAmount"
										]
									},
									null
								]
							}
						},
						minOrderValue: {
							$min: {
								$cond: [
									{
										$and: [
											{ $ne: ["$totalAmount", "TBD"] },
											{ $eq: ["$status", "delivered"] }
										]
									},
									{
										$cond: [
											{ $ifNull: ["$finalTotalAmount", false] },
											"$finalTotalAmount",
											"$totalAmount"
										]
									},
									null
								]
							}
						},
						maxOrderValue: {
							$max: {
								$cond: [
									{
										$and: [
											{ $ne: ["$totalAmount", "TBD"] },
											{ $eq: ["$status", "delivered"] }
										]
									},
									{
										$cond: [
											{ $ifNull: ["$finalTotalAmount", false] },
											"$finalTotalAmount",
											"$totalAmount"
										]
									},
									null
								]
							}
						}
					}
				}
			]);

			// Run aggregation for status breakdown
			const statusStats = await this.aggregate([
				{ $match: matchStage },
				{
					$group: {
						_id: "$status",
						count: { $sum: 1 },
						revenue: {
							$sum: {
								$cond: [
									{
										$and: [
											{ $ne: ["$totalAmount", "TBD"] },
											{ $eq: ["$_id", "delivered"] }
										]
									},
									{
										$cond: [
											{ $ifNull: ["$finalTotalAmount", false] },
											"$finalTotalAmount",
											"$totalAmount"
										]
									},
									0
								]
							}
						},
						sales: {
							$sum: {
								$cond: [
									{ $ne: ["$totalAmount", "TBD"] },
									{
										$cond: [
											{ $ifNull: ["$finalTotalAmount", false] },
											"$finalTotalAmount",
											"$totalAmount"
										]
									},
									0
								]
							}
						}
					}
				},
				{ $sort: { count: -1 } }
			]);

			// Run aggregation for payment status breakdown
			const paymentStatusStats = await this.aggregate([
				{ $match: matchStage },
				{
					$group: {
						_id: "$paymentStatus",
						count: { $sum: 1 },
						revenue: {
							$sum: {
								$cond: [
									{
										$and: [
											{ $ne: ["$totalAmount", "TBD"] },
											{ $eq: ["$status", "delivered"] }
										]
									},
									{
										$cond: [
											{ $ifNull: ["$finalTotalAmount", false] },
											"$finalTotalAmount",
											"$totalAmount"
										]
									},
									0
								]
							}
						}
					}
				},
				{ $sort: { count: -1 } }
			]);

			// Calculate daily averages
			const dateRangeStats = await this.aggregate([
				{ $match: matchStage },
				{
					$group: {
						_id: {
							$dateToString: {
								format: "%Y-%m-%d",
								date: "$createdAt"
							}
						},
						orderCount: { $sum: 1 },
						dailyRevenue: {
							$sum: {
								$cond: [
									{
										$and: [
											{ $ne: ["$totalAmount", "TBD"] },
											{ $eq: ["$status", "delivered"] }
										]
									},
									{
										$cond: [
											{ $ifNull: ["$finalTotalAmount", false] },
											"$finalTotalAmount",
											"$totalAmount"
										]
									},
									0
								]
							}
						}
					}
				},
				{
					$group: {
						_id: null,
						avgDailyOrders: { $avg: "$orderCount" },
						avgDailyRevenue: { $avg: "$dailyRevenue" },
						totalDays: { $sum: 1 }
					}
				}
			]);

			// Format the results
			const result = {
				overall: overallStats.length > 0 ? {
					totalOrders: overallStats[0].totalOrders || 0,
					completedOrders: overallStats[0].completedOrders || 0,
					pendingDeliveryFeeOrders: overallStats[0].pendingDeliveryFeeOrders || 0,
					totalRevenue: overallStats[0].totalRevenue || 0,
					totalSales: overallStats[0].totalSales || 0,
					averageOrderValue: overallStats[0].averageOrderValue || 0,
					minOrderValue: overallStats[0].minOrderValue || 0,
					maxOrderValue: overallStats[0].maxOrderValue || 0,
					avgDailyOrders: dateRangeStats.length > 0 ? (dateRangeStats[0].avgDailyOrders || 0) : 0,
					avgDailyRevenue: dateRangeStats.length > 0 ? (dateRangeStats[0].avgDailyRevenue || 0) : 0,
					periodDays: dateRangeStats.length > 0 ? (dateRangeStats[0].totalDays || 0) : 0
				} : {
					totalOrders: 0,
					completedOrders: 0,
					pendingDeliveryFeeOrders: 0,
					totalRevenue: 0,
					totalSales: 0,
					averageOrderValue: 0,
					minOrderValue: 0,
					maxOrderValue: 0,
					avgDailyOrders: 0,
					avgDailyRevenue: 0,
					periodDays: 0
				},
				byStatus: statusStats.reduce((acc, stat) => {
					acc[stat._id] = {
						count: stat.count,
						revenue: stat.sales,
						sales: stat.sales
					};
					return acc;
				}, {}),
				byPaymentStatus: paymentStatusStats.reduce((acc, stat) => {
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
	 * Search orders by multiple criteria
	 * @param {string} searchTerm - Search term
	 * @param {Object} options - Additional options
	 * @returns {Promise<Object>} Search results
	 * @throws {DatabaseError} Database error
	 */
	async searchOrders(searchTerm, options = {}) {
		try {
			return this.getOrders({ ...options, search: searchTerm });
		} catch (error) {
			this.logger.error(`Error searching orders: ${error.message}`);
			throw new DatabaseError(`Error searching orders: ${error.message}`);
		}
	}

	/**
	 * Helper method to parse sort option
	 * @param {string|Object} sortOption - Sort option string (e.g., '-createdAt,+name') or object
	 * @returns {Object} MongoDB sort object
	 * @private
	 */
	_parseSortOption(sortOption) {
		if (!sortOption) return { createdAt: -1 };

		// If already an object, return as is
		if (typeof sortOption === 'object' && !Array.isArray(sortOption)) {
			return sortOption;
		}

		// Parse string format
		const sortFields = sortOption.toString().split(',');
		const sortObject = {};

		sortFields.forEach(field => {
			field = field.trim();
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

	/**
	 * Get orders with pending delivery fee
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Paginated orders
	 */
	async getOrdersWithPendingDeliveryFee(options = {}) {
		try {
			return this.getOrders({ ...options, deliveryFeePending: true });
		} catch (error) {
			this.logger.error(`Error fetching orders with pending delivery fee: ${error.message}`);
			throw new DatabaseError(`Error fetching orders with pending delivery fee: ${error.message}`);
		}
	}
}

module.exports = new OrderRepository();