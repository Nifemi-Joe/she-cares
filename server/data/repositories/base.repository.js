// src/data/repositories/base.repository.js

const { DatabaseError } = require('../../utils/error-handler');

/**
 * @class BaseRepository
 * @description Abstract base repository with common CRUD operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class BaseRepository {
	/**
	 * Create a new BaseRepository instance
	 * @param {Object} model - Mongoose model
	 * @param {Object} logger - Logger instance
	 */
	constructor(model, logger) {
		if (!model) {
			throw new Error('Model is required for repository initialization');
		}

		this.model = model;
		this.logger = logger || console;

		// Check if model is properly initialized
		if (!this.model.modelName) {
			throw new Error('Invalid Mongoose model provided to repository');
		}

		this.logger.info(`Repository initialized for model: ${this.model.modelName}`);
	}

	/**
	 * Create a new document
	 * @param {Object} data - Document data
	 * @returns {Promise<Object>} Created document
	 * @throws {DatabaseError} Database error
	 */
	async create(data) {
		this._checkConnectionStatus();

		try {
			const result = await this.model.create(data);
			this.logger.info(`Created ${this.model.modelName} with ID: ${result._id}`);
			return result.toObject ? result.toObject() : result;
		} catch (error) {
			this.logger.error(`Error creating ${this.model.modelName}: ${error.message}`);
			throw new DatabaseError(`Error creating document: ${error.message}`);
		}
	}

	/**
	 * Find document by ID
	 * @param {string} id - Document ID
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Found document or null
	 * @throws {DatabaseError} Database error
	 */
	async findById(id, options = {}) {
		this._checkConnectionStatus();

		try {
			let query = this.model.findById(id);

			if (options.select) {
				query = query.select(options.select);
			}

			if (options.populate) {
				const populates = Array.isArray(options.populate)
					? options.populate
					: [options.populate];

				populates.forEach(p => {
					query = query.populate(p);
				});
			}

			const result = await query.exec();
			return result ? (result.toObject ? result.toObject() : result) : null;
		} catch (error) {
			this.logger.error(`Error finding ${this.model.modelName} by ID ${id}: ${error.message}`);
			throw new DatabaseError(`Error finding document by ID: ${error.message}`);
		}
	}

	/**
	 * Find documents by filter criteria
	 * @param {Object} filter - Filter criteria
	 * @param {Object} options - Query options
	 * @returns {Promise<Array<Object>>} Found documents
	 * @throws {DatabaseError} Database error
	 */
	async find(filter = {}, options = {}) {
		this._checkConnectionStatus();

		try {
			let query = this.model.find(filter);

			if (options.select) {
				query = query.select(options.select);
			}

			if (options.populate) {
				const populates = Array.isArray(options.populate)
					? options.populate
					: [options.populate];

				populates.forEach(p => {
					query = query.populate(p);
				});
			}

			if (options.sort) {
				query = query.sort(options.sort);
			}

			if (options.skip) {
				query = query.skip(options.skip);
			}

			if (options.limit) {
				query = query.limit(options.limit);
			}

			const results = await query.exec();
			return results.map(result => result.toObject ? result.toObject() : result);
		} catch (error) {
			this.logger.error(`Error finding ${this.model.modelName} documents: ${error.message}`);
			throw new DatabaseError(`Error finding documents: ${error.message}`);
		}
	}

	/**
	 * Find one document by filter criteria
	 * @param {Object} filter - Filter criteria
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Found document or null
	 * @throws {DatabaseError} Database error
	 */
	async findOne(filter, options = {}) {
		this._checkConnectionStatus();

		try {
			let query = this.model.findOne(filter);

			if (options.select) {
				query = query.select(options.select);
			}

			if (options.populate) {
				const populates = Array.isArray(options.populate)
					? options.populate
					: [options.populate];

				populates.forEach(p => {
					query = query.populate(p);
				});
			}

			const result = await query.exec();
			return result ? (result.toObject ? result.toObject() : result) : null;
		} catch (error) {
			this.logger.error(`Error finding one ${this.model.modelName} document: ${error.message}`);
			throw new DatabaseError(`Error finding one document: ${error.message}`);
		}
	}

	/**
	 * Update document by ID
	 * @param {string} id - Document ID
	 * @param {Object} update - Update data
	 * @param {Object} options - Update options
	 * @returns {Promise<Object>} Updated document or null
	 * @throws {DatabaseError} Database error
	 */
	async update(id, update, options = {}) {
		this._checkConnectionStatus();

		try {
			const defaults = { new: true, runValidators: true };
			const opts = { ...defaults, ...options };

			const result = await this.model.findByIdAndUpdate(id, update, opts);
			this.logger.info(`Updated ${this.model.modelName} with ID: ${id}`);
			return result ? (result.toObject ? result.toObject() : result) : null;
		} catch (error) {
			this.logger.error(`Error updating ${this.model.modelName} with ID ${id}: ${error.message}`);
			throw new DatabaseError(`Error updating document: ${error.message}`);
		}
	}

	/**
	 * Delete document by ID
	 * @param {string} id - Document ID
	 * @returns {Promise<boolean>} Whether document was deleted
	 * @throws {DatabaseError} Database error
	 */
	async delete(id) {
		this._checkConnectionStatus();

		try {
			const result = await this.model.findByIdAndDelete(id);
			const success = !!result;

			if (success) {
				this.logger.info(`Deleted ${this.model.modelName} with ID: ${id}`);
			} else {
				this.logger.warn(`Attempted to delete non-existent ${this.model.modelName} with ID: ${id}`);
			}

			return success;
		} catch (error) {
			this.logger.error(`Error deleting ${this.model.modelName} with ID ${id}: ${error.message}`);
			throw new DatabaseError(`Error deleting document: ${error.message}`);
		}
	}

	/**
	 * Count documents matching filter criteria
	 * @param {Object} filter - Filter criteria
	 * @returns {Promise<number>} Document count
	 * @throws {DatabaseError} Database error
	 */
	async count(filter = {}) {
		this._checkConnectionStatus();

		try {
			return await this.model.countDocuments(filter);
		} catch (error) {
			this.logger.error(`Error counting ${this.model.modelName} documents: ${error.message}`);
			throw new DatabaseError(`Error counting documents: ${error.message}`);
		}
	}

	/**
	 * Check if document exists
	 * @param {Object} filter - Filter criteria
	 * @returns {Promise<boolean>} Whether document exists
	 * @throws {DatabaseError} Database error
	 */
	async exists(filter) {
		this._checkConnectionStatus();

		try {
			return !!(await this.model.exists(filter));
		} catch (error) {
			this.logger.error(`Error checking if ${this.model.modelName} exists: ${error.message}`);
			throw new DatabaseError(`Error checking if document exists: ${error.message}`);
		}
	}

	/**
	 * Execute aggregation pipeline
	 * @param {Array} pipeline - Aggregation pipeline
	 * @returns {Promise<Array>} Aggregation results
	 * @throws {DatabaseError} Database error
	 */
	async aggregate(pipeline) {
		this._checkConnectionStatus();

		try {
			return await this.model.aggregate(pipeline);
		} catch (error) {
			this.logger.error(`Error executing aggregation on ${this.model.modelName}: ${error.message}`);
			throw new DatabaseError(`Error executing aggregation: ${error.message}`);
		}
	}

	/**
	 * Find all documents
	 * @param {Object} query - Query object
	 * @param {Object} options - Query options
	 * @returns {Promise<Array<Object>>} List of documents
	 */
	async findAll(query = {}, options = {}) {
		this._checkConnectionStatus();

		try {
			const { skip = 0, limit = 100, sort = { createdAt: -1 } } = options;

			const documents = await this.model
				.find(query)
				.sort(sort)
				.skip(skip)
				.limit(limit)
				.lean();

			return documents.map(doc => ({
				...doc,
				id: doc._id.toString()
			}));
		} catch (error) {
			throw new DatabaseError(`Error finding documents: ${error.message}`);
		}
	}

	/**
	 * Execute transaction with callback
	 * @param {Function} callback - Transaction callback
	 * @returns {Promise<*>} Transaction result
	 * @throws {DatabaseError} Transaction error
	 */
	async withTransaction(callback) {
		this._checkConnectionStatus();

		if (!this.model.db) {
			throw new DatabaseError('Database connection not available for transactions');
		}

		const session = await this.model.db.startSession();
		try {
			session.startTransaction();
			const result = await callback(session);
			await session.commitTransaction();
			return result;
		} catch (error) {
			await session.abortTransaction();
			this.logger.error(`Transaction error in ${this.model.modelName} repository: ${error.message}`);
			throw new DatabaseError(`Transaction error: ${error.message}`);
		} finally {
			session.endSession();
		}
	}

	/**
	 * Check if database connection is available
	 * @private
	 * @throws {DatabaseError} If database connection is not available
	 */
	_checkConnectionStatus() {
		if (!this.model.db || this.model.db.readyState !== 1) {
			const errorMsg = 'Repository not initialized with database connection';
			this.logger.error(errorMsg);
			throw new DatabaseError(errorMsg);
		}
	}
}

module.exports = BaseRepository;