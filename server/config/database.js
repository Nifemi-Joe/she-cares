// src/config/database.config.js

/**
 * Database configuration
 * @module config/database
 * @description Database connection settings
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

const env = process.env.NODE_ENV || 'development';

/**
 * MongoDB connection URI for different environments
 */
const mongoUris = {
	development: process.env.MONGODB_URI_DEV,
	test: process.env.MONGODB_URI_TEST,
	production: process.env.MONGODB_URI
};

/**
 * Database configuration
 */
const dbConfig = {
	development: {
		uri: mongoUris.development,
		strictQuery: false,
		debug: process.env.MONGOOSE_DEBUG === 'true' || true,
		poolSize: parseInt(process.env.DB_POOL_SIZE || '5', 10)
	},
	test: {
		uri: mongoUris.test,
		strictQuery: false,
		debug: false,
		poolSize: 5
	},
	production: {
		uri: mongoUris.production,
		strictQuery: true,
		debug: false,
		poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10)
	}
};

module.exports = dbConfig[env];