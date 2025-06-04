// src/infrastructure/database/connection.js

const mongoose = require('mongoose');
const logger = require('../logging/logger');
const config = require('../../config/database');

/**
 * Connect to MongoDB database
 * @returns {Promise} Database connection
 */
const connectToDatabase = async () => {
	try {
		// Set mongoose options
		mongoose.set('strictQuery', config.strictQuery || false);

		// Connect to database
		const connection = await mongoose.connect(config.uri, {
			serverSelectionTimeoutMS: 10000, // Timeout after 5s instead of 30s
		});

		logger.info(`MongoDB connected: ${connection.connection.host}`);

		// Handle connection events
		mongoose.connection.on('error', (err) => {
			logger.error(`MongoDB connection error: ${err}`);
		});

		mongoose.connection.on('disconnected', () => {
			logger.warn('MongoDB disconnected');
		});

		return connection;
	} catch (error) {
		logger.error(`Error connecting to database: ${error.message}`);
		throw error;
	}
};

/**
 * Close database connection
 * @returns {Promise} Promise that resolves when connection is closed
 */
const closeDatabaseConnection = async () => {
	if (mongoose.connection.readyState !== 0) {
		await mongoose.connection.close();
		logger.info('MongoDB connection closed');
	}
};



module.exports = {
	connectToDatabase,
	closeDatabaseConnection,
};