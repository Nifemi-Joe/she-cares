// src/infrastructure/database/mongodb.js

const mongoose = require('mongoose');
const connection = require('./connection');
const logger = require('../logging/logger');

/**
 * MongoDB adapter
 * @description Provides MongoDB specific operations and utilities
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class MongoDBAdapter {
	/**
	 * Initialize MongoDB adapter
	 */
	constructor() {
		this.mongoose = mongoose;
	}

	/**
	 * Ensure database connection
	 * @returns {Promise<mongoose.Connection>} Database connection
	 */
	async ensureConnection() {
		if (!connection.isConnectedToDatabase()) {
			await connection.connect();
		}
		return connection.getConnection();
	}

	/**
	 * Create a new MongoDB model
	 * @param {string} name - Model name
	 * @param {mongoose.Schema} schema - Mongoose schema
	 * @returns {mongoose.Model} Created model
	 */
	createModel(name, schema) {
		if (!schema || !(schema instanceof mongoose.Schema)) {
			throw new Error('Invalid schema provided');
		}

		// Add timestamps by default
		if (!schema.options.timestamps) {
			schema.set('timestamps', true);
		}

		// Add toJSON transform to convert _id to id
		if (!schema.options.toJSON) {
			schema.set('toJSON', {
				transform: (doc, ret) => {
					ret.id = ret._id.toString();
					delete ret._id;
					delete ret.__v;
					return ret;
				}
			});
		}

		// Return the model (mongoose will reuse if already exists)
		return mongoose.model(name, schema);
	}

	/**
	 * Run a MongoDB transaction
	 * @param {Function} callback - Transaction callback
	 * @returns {Promise<any>} Transaction result
	 */
	async runTransaction(callback) {
		await this.ensureConnection();

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const result = await callback(session);
			await session.commitTransaction();
			return result;
		} catch (error) {
			await session.abortTransaction();
			logger.error('Transaction aborted:', error);
			throw error;
		} finally {
			session.endSession();
		}
	}

	/**
	 * Create MongoDB index
	 * @param {mongoose.Model} model - Mongoose model
	 * @param {Object} fields - Fields to index
	 * @param {Object} options - Index options
	 * @returns {Promise<void>}
	 */
	async createIndex(model, fields, options = {}) {
		try {
			await this.ensureConnection();
			await model.collection.createIndex(fields, options);
			logger.info(`Created index on ${model.modelName} for fields:`, fields);
		} catch (error) {
			logger.error(`Error creating index on ${model.modelName}:`, error);
			throw error;
		}
	}

	/**
	 * Convert string ID to MongoDB ObjectId
	 * @param {string} id - String ID
	 * @returns {mongoose.Types.ObjectId} ObjectId
	 */
	toObjectId(id) {
		try {
			return new mongoose.Types.ObjectId(id);
		} catch (error) {
			logger.error('Invalid ObjectId:', id);
			throw new Error(`Invalid ID format: ${id}`);
		}
	}

	/**
	 * Convert MongoDB ObjectId to string
	 * @param {mongoose.Types.ObjectId} objectId - MongoDB ObjectId
	 * @returns {string} String ID
	 */
	fromObjectId(objectId) {
		return objectId.toString();
	}

	/**
	 * Check if an ID is a valid MongoDB ObjectId
	 * @param {string} id - ID to check
	 * @returns {boolean} Whether ID is valid
	 */
	isValidObjectId(id) {
		return mongoose.Types.ObjectId.isValid(id);
	}

	/**
	 * Create pagination options for MongoDB queries
	 * @param {Object} paginationOptions - Pagination options
	 * @param {number} paginationOptions.page - Page number
	 * @param {number} paginationOptions.limit - Items per page
	 * @param {Object} paginationOptions.sort - Sort criteria
	 * @returns {Object} MongoDB pagination options
	 */
	createPaginationOptions({ page = 1, limit = 10, sort = { createdAt: -1 } }) {
		return {
			skip: (page - 1) * limit,
			limit: parseInt(limit, 10),
			sort
		};
	}
}

// Create and export a singleton instance
module.exports = new MongoDBAdapter();