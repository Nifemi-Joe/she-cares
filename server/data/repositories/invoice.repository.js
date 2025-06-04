// src/data/repositories/invoice.repository.js

const BaseRepository = require('./base.repository');
const invoiceSchema = require('../schemas/invoice.schema');
const { DatabaseError } = require('../../utils/error-handler');
const mongodb = require('../../infrastructure/database/mongodb');

/**
 * @class InvoiceRepository
 * @description Repository for managing invoice data persistence
 * @extends BaseRepository
 */
class InvoiceRepository extends BaseRepository {
	constructor() {
		super(invoiceSchema);
		this.collectionName = 'invoices';
	}

	/**
	 * Find all invoices with optional filters
	 * @param {Object} options - Query options (pagination, filters, sorting)
	 * @returns {Promise<Array<Object>>} List of invoices
	 */
	async findAll(options = {}) {
		try {
			// Ensure connection before proceeding

			// Get the mongoose connection
			const connection = await mongodb.mongoose.connection;
			const collection = connection.collection(this.collectionName);

			// Parse options
			const {
				page = 1,
				limit = 10,
				sort = '-createdAt',
				status,
				fromDate,
				toDate,
				clientId
			} = options;

			// Build query
			const query = {};

			if (status) {
				query.status = status;
			}

			if (clientId) {
				query.clientId = clientId;
			}

			if (fromDate || toDate) {
				query.createdAt = {};

				if (fromDate) {
					query.createdAt.$gte = new Date(fromDate);
				}

				if (toDate) {
					query.createdAt.$lte = new Date(toDate);
				}
			}

			// Build sort object
			const sortObj = {};
			const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
			const sortDirection = sort.startsWith('-') ? -1 : 1;
			sortObj[sortField] = sortDirection;

			// Calculate pagination
			const skip = (page - 1) * limit;

			const cursor = collection
				.find(query)
				.sort(sortObj)
				.skip(skip)
				.limit(limit);

			const invoices = await cursor.toArray();
			return invoices.map(invoice => this._toModel(invoice));
		} catch (error) {
			throw new DatabaseError(`Error finding documents: ${error.message}`);
		}
	}

	/**
	 * Find invoice by invoice number
	 * @param {string} invoiceNumber - Invoice number
	 * @returns {Promise<Object>} Invoice
	 */
	async findByInvoiceNumber(invoiceNumber) {
		try {
			const connection = await mongodb.mongoose.connection;
			const collection = connection.collection(this.collectionName);

			const invoice = await collection.findOne({ invoiceNumber });

			if (!invoice) {
				return null;
			}

			return this._toModel(invoice);
		} catch (error) {
			throw new DatabaseError(`Error finding invoice by number: ${error.message}`);
		}
	}

	/**
	 * Find invoice by order ID
	 * @param {string} orderId - Order ID
	 * @returns {Promise<Object>} Invoice
	 */
	async findByOrderId(orderId) {
		try {
			await mongodb.ensureConnection();
			const connection = await mongodb.mongoose.connection;
			const collection = connection.collection(this.collectionName);

			const invoice = await collection.findOne({ orderId });

			if (!invoice) {
				return null;
			}

			return this._toModel(invoice);
		} catch (error) {
			throw new DatabaseError(`Error finding invoice by order ID: ${error.message}`);
		}
	}

	/**
	 * Find invoices by client ID
	 * @param {string} clientId - Client ID
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of invoices
	 */
	async findByClientId(clientId, options = {}) {
		try {
			const { skip, limit, sort } = this._parsePaginationOptions(options);

			await mongodb.ensureConnection();
			const connection = await mongodb.mongoose.connection;
			const collection = connection.collection(this.collectionName);

			const query = { clientId };
			const cursor = collection
				.find(query)
				.skip(skip)
				.limit(limit);

			if (sort) {
				cursor.sort(sort);
			}

			const invoices = await cursor.toArray();
			return invoices.map(invoice => this._toModel(invoice));
		} catch (error) {
			throw new DatabaseError(`Error finding invoices by client ID: ${error.message}`);
		}
	}

	/**
	 * Find invoices by status
	 * @param {string} status - Invoice status
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of invoices
	 */
	async findByStatus(status, options = {}) {
		try {
			const { skip, limit, sort } = this._parsePaginationOptions(options);

			await mongodb.ensureConnection();
			const connection = await mongodb.mongoose.connection;
			const collection = connection.collection(this.collectionName);

			const query = { status };
			const cursor = collection
				.find(query)
				.skip(skip)
				.limit(limit);

			if (sort) {
				cursor.sort(sort);
			}

			const invoices = await cursor.toArray();
			return invoices.map(invoice => this._toModel(invoice));
		} catch (error) {
			throw new DatabaseError(`Error finding invoices by status: ${error.message}`);
		}
	}

	/**
	 * Find invoices between date range
	 * @param {Date} startDate - Start date
	 * @param {Date} endDate - End date
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array>} List of invoices
	 */
	async findByDateRange(startDate, endDate, options = {}) {
		try {
			const { skip, limit, sort } = this._parsePaginationOptions(options);

			await mongodb.ensureConnection();
			const connection = await mongodb.mongoose.connection;
			const collection = connection.collection(this.collectionName);

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

			const invoices = await cursor.toArray();
			return invoices.map(invoice => this._toModel(invoice));
		} catch (error) {
			throw new DatabaseError(`Error finding invoices by date range: ${error.message}`);
		}
	}

	/**
	 * Count invoices by month and year
	 * @param {string} month - Month (01-12)
	 * @param {string} year - Year (YY or YYYY)
	 * @returns {Promise<number>} Count of invoices
	 */
	async countByMonthYear(month, year) {
		try {
			await mongodb.ensureConnection();
			const connection = await mongodb.mongoose.connection;
			const collection = connection.collection(this.collectionName);

			// Format: INV-YY-MM-XXXX
			const prefix = `INV-${year.length === 4 ? year.slice(-2) : year}-${month}`;

			const count = await collection.countDocuments({
				invoiceNumber: { $regex: `^${prefix}` }
			});

			return count;
		} catch (error) {
			throw new DatabaseError(`Error counting invoices by month-year: ${error.message}`);
		}
	}

	/**
	 * Get invoice statistics
	 * @param {Object} options - Filter options (date range, etc.)
	 * @returns {Promise<Object>} Invoice statistics
	 */
	async getStats(options = {}) {
		try {
			await mongodb.ensureConnection();
			const connection = await mongodb.mongoose.connection;
			const collection = connection.collection(this.collectionName);

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
						totalInvoices: { $sum: 1 },
						totalAmount: { $sum: '$totalAmount' },
						paidAmount: { $sum: '$paidAmount' },
						avgInvoiceAmount: { $avg: '$totalAmount' },
						paidInvoices: {
							$sum: {
								$cond: [{ $eq: ['$status', 'paid'] }, 1, 0]
							}
						},
						pendingInvoices: {
							$sum: {
								$cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
							}
						},
						partiallyPaidInvoices: {
							$sum: {
								$cond: [{ $eq: ['$status', 'partially_paid'] }, 1, 0]
							}
						},
						cancelledInvoices: {
							$sum: {
								$cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
							}
						}
					}
				}
			];

			const result = await collection.aggregate(pipeline).toArray();
			return result[0] || {
				totalInvoices: 0,
				totalAmount: 0,
				paidAmount: 0,
				avgInvoiceAmount: 0,
				paidInvoices: 0,
				pendingInvoices: 0,
				partiallyPaidInvoices: 0,
				cancelledInvoices: 0
			};
		} catch (error) {
			throw new DatabaseError(`Error getting invoice statistics: ${error.message}`);
		}
	}

	/**
	 * Parse pagination options
	 * @param {Object} options - Pagination options
	 * @returns {Object} Parsed options
	 * @private
	 */
	_parsePaginationOptions(options = {}) {
		const page = parseInt(options.page, 10) || 1;
		const limit = parseInt(options.limit, 10) || 10;
		const skip = (page - 1) * limit;

		let sort = null;
		if (options.sort) {
			sort = {};
			const sortField = options.sort.startsWith('-') ? options.sort.substring(1) : options.sort;
			const sortDirection = options.sort.startsWith('-') ? -1 : 1;
			sort[sortField] = sortDirection;
		}

		return { skip, limit, sort };
	}

	/**
	 * Convert MongoDB document to model
	 * @param {Object} document - MongoDB document
	 * @returns {Object} Model
	 * @private
	 */
	_toModel(document) {
		if (!document) return null;

		// Convert MongoDB _id to id
		const { _id, ...rest } = document;
		return {
			...rest,
			id: _id.toString()
		};
	}

	/**
	 * Validate invoice data against schema
	 * @param {Object} data - Invoice data to validate
	 * @returns {Object} Validated data
	 * @protected
	 */
	_validateSchema(data) {
		return invoiceSchema.validate(data);
	}
}

module.exports = new InvoiceRepository();