// src/infrastructure/database/connection.js

const mongoose = require('mongoose');
const dbConfig = require('../../config/database');
const logger = require('../logging/logger');

/**
 * Database connection manager
 * @description Manages MongoDB database connections
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class DatabaseConnection {
	constructor() {
		this.isConnected = false;
		this.connection = null;
		this.connectionString = this._buildConnectionString();
	}

	/**
	 * Connect to the database
	 * @returns {Promise<mongoose.Connection>} Mongoose connection
	 */
	async connect() {
		if (this.isConnected) {
			logger.info('Using existing database connection');
			return this.connection;
		}

		try {
			logger.info('Connecting to MongoDB...');

			// Set mongoose options
			mongoose.set('strictQuery', false);

			// Connect to MongoDB
			await mongoose.connect(this.connectionString, {
				useNewUrlParser: true,
				useUnifiedTopology: true,
				serverSelectionTimeoutMS: 5000, // Timeout after 5s
				maxPoolSize: dbConfig.poolSize || 10
			});

			this.connection = mongoose.connection;
			this.isConnected = true;

			logger.info('Connected to MongoDB successfully');

			// Set up connection event handlers
			this._setupConnectionHandlers();

			return this.connection;
		} catch (error) {
			logger.error('Error connecting to MongoDB:', error);
			throw error;
		}
	}

	/**
	 * Disconnect from the database
	 * @returns {Promise<void>}
	 */
	async disconnect() {
		if (!this.isConnected) {
			logger.info('No active connection to disconnect');
			return;
		}

		try {
			logger.info('Disconnecting from MongoDB...');
			await mongoose.disconnect();
			this.isConnected = false;
			this.connection = null;
			logger.info('Disconnected from MongoDB successfully');
		} catch (error) {
			logger.error('Error disconnecting from MongoDB:', error);
			throw error;
		}
	}

	/**
	 * Check database connection status
	 * @returns {boolean} Connection status
	 */
	isConnectedToDatabase() {
		return this.isConnected &&
			this.connection &&
			this.connection.readyState === 1;
	}

	/**
	 * Get current connection
	 * @returns {mongoose.Connection|null} Mongoose connection or null if not connected
	 */
	getConnection() {
		return this.isConnected ? this.connection : null;
	}

	/**
	 * Build MongoDB connection string
	 * @returns {string} Connection string
	 * @private
	 */
	_buildConnectionString() {
		// Use connection string from config if provided
		if (dbConfig.uri) {
			return dbConfig.uri;
		}

		// Otherwise build from components
		const { username, password, host, port, database, authSource } = dbConfig;

		let connectionString = 'mongodb://';

		// Add authentication if provided
		if (username && password) {
			connectionString += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
		}

		// Add host and port
		connectionString += `${host}:${port}`;

		// Add database name
		connectionString += `/${database}`;

		// Add options
		const options = [];

		if (authSource) {
			options.push(`authSource=${authSource}`);
		}

		if (options.length > 0) {
			connectionString += `?${options.join('&')}`;
		}

		return connectionString;
	}

	/**
	 * Set up connection event handlers
	 * @private
	 */
	_setupConnectionHandlers() {
		if (!this.connection) return;

		this.connection.on('error', (err) => {
			logger.error('MongoDB connection error:', err);
		});

		this.connection.on('disconnected', () => {
			this.isConnected = false;
			logger.warn('MongoDB disconnected');
		});

		this.connection.on('reconnected', () => {
			this.isConnected = true;
			logger.info('MongoDB reconnected');
		});

		// Handle process termination
		process.on('SIGINT', async () => {
			await this.disconnect();
			process.exit(0);
		});
	}
}

// Create and export a singleton instance
const databaseConnection = new DatabaseConnection();
module.exports = databaseConnection;