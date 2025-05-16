// src/data/repositories/base.repository.js

/**
 * @class BaseRepository
 * @description Abstract base repository with common CRUD operations
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */
class BaseRepository {
	/**
	 * Create a new BaseRepository instance
	 * @param {Object} model - Mongoose model
	 * @param {Object} logger - Logger instance
	 */
	constructor(model, logger) {
		this.model = model;
		this.logger = logger;
	}

	/**
	 * Create a new document
	 * @param {Object} data - Document data
	 * @returns {Promise<Object>} Created document
	 * @throws {Error} Database error
	 */
	async create(data) {
		try {
			const result = await this.model.create(data);
			this.logger.info(`Created ${this.model.modelName} with ID: ${result._id}`);
			return result.toObject();
		} catch (error) {
			this.logger.error(`Error creating ${this.model.modelName}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Find document by ID
	 * @param {string} id - Document ID
	 * @param {Object} options - Query options
	 * @param {Object} options.select - Fields to select
	 * @param {Object} options.populate - Population options
	 * @returns {Promise<Object>} Found document or null
	 * @throws {Error} Database error
	 */
	async findById(id, options = {}) {
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
			return result ? result.toObject() : null;
		} catch (error) {
			this.logger.error(`Error finding ${this.model.modelName} by ID ${id}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Find documents by filter criteria
	 * @param {Object} filter - Filter criteria
	 * @param {Object} options - Query options
	 * @param {Object} options.select - Fields to select
	 * @param {Object} options.populate - Population options
	 * @param {Object} options.sort - Sort options
	 * @param {number} options.skip - Number of documents to skip
	 * @param {number} options.limit - Maximum number of documents to return
	 * @returns {Promise<Array<Object>>} Found documents
	 * @throws {Error} Database error
	 */
	async find(filter = {}, options = {}) {
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
			return results.map(result => result.toObject());
		} catch (error) {
			this.logger.error(`Error finding ${this.model.modelName} documents: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Find one document by filter criteria
	 * @param {Object} filter - Filter criteria
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Found document or null
	 * @throws {Error} Database error
	 */
	async findOne(filter, options = {}) {
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
			return result ? result.toObject() : null;
		} catch (error) {
			this.logger.error(`Error finding one ${this.model.modelName} document: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Update document by ID
	 * @param {string} id - Document ID
	 * @param {Object} update - Update data
	 * @param {Object} options - Update options
	 * @returns {Promise<Object>} Updated document or null
	 * @throws {Error} Database error
	 */
	async update(id, update, options = {}) {
		try {
			const defaults = { new: true, runValidators: true };
			const opts = { ...defaults, ...options };

			const result = await this.model.findByIdAndUpdate(id, update, opts);
			this.logger.info(`Updated ${this.model.modelName} with ID: ${id}`);
			return result ? result.toObject() : null;
		} catch (error) {
			this.logger.error(`Error updating ${this.model.modelName} with ID ${id}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Delete document by ID
	 * @param {string} id - Document ID
	 * @returns {Promise<boolean>} Whether document was deleted
	 * @throws {Error} Database error
	 */
	async delete(id) {
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
			throw error;
		}
	}

	/**
	 * Count documents matching filter criteria
	 * @param {Object} filter - Filter criteria
	 * @returns {Promise<number>} Document count
	 * @throws {Error} Database error
	 */
	async count(filter = {}) {
		try {
			return await this.model.countDocuments(filter);
		} catch (error) {
			this.logger.error(`Error counting ${this.model.modelName} documents: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Check if document exists
	 * @param {Object} filter - Filter criteria
	 * @returns {Promise<boolean>} Whether document exists
	 * @throws {Error} Database error
	 */
	async exists(filter) {
		try {
			return await this.model.exists(filter);
		} catch (error) {
			this.logger.error(`Error checking if ${this.model.modelName} exists: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Execute aggregation pipeline
	 * @param {Array} pipeline - Aggregation pipeline
	 * @returns {Promise<Array>} Aggregation results
	 * @throws {Error} Database error
	 */
	async aggregate(pipeline) {
		try {
			return await this.model.aggregate(pipeline);
		} catch (error) {
			this.logger.error(`Error executing aggregation on ${this.model.modelName}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Execute transaction with callback
	 * @param {Function} callback - Transaction callback
	 * @returns {Promise<*>} Transaction result
	 * @throws {Error} Transaction error
	 */
	async withTransaction(callback) {
		const session = await this.model.db.startSession();
		try {
			session.startTransaction();
			const result = await callback(session);
			await session.commitTransaction();
			return result;
		} catch (error) {
			await session.abortTransaction();
			this.logger.error(`Transaction error in ${this.model.modelName} repository: ${error.message}`);
			throw error;
		} finally {
			session.endSession();
		}
	}
}

module.exports = BaseRepository;