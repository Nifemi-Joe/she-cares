// src/config/app.config.js

/**
 * Application configuration
 * @module config/app
 * @description Core application settings
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

const env = process.env.NODE_ENV || 'development';

/**
 * Application configuration by environment
 */
const appConfig = {
	development: {
		env: 'development',
		name: 'SheCares Market API',
		version: '1.0.0',
		port: parseInt(process.env.PORT || '7009', 10),
		baseUrl: process.env.BASE_URL || 'http://localhost:7009',
		clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
		cors: {
			origin: '*',
			credentials: true
		},
		serveStaticFiles: true,
		enableApiDocs: true,
		docsUrl: '/api-docs',
		logLevel: 'debug',
		uploadDir: process.env.UPLOAD_DIR || './uploads',
		defaultAdminUser: {
			email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@shecaresmarket.com',
			password: process.env.DEFAULT_ADMIN_PASSWORD || 'adminPassword123!'
		}
	},
	test: {
		env: 'test',
		name: 'SheCares Market API (Test)',
		version: '1.0.0',
		port: parseInt(process.env.PORT || '5001', 10),
		baseUrl: process.env.BASE_URL || 'http://localhost:5001',
		clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
		cors: {
			origin: '*',
			credentials: true
		},
		serveStaticFiles: true,
		enableApiDocs: true,
		docsUrl: '/api-docs',
		logLevel: 'error', // Less verbose in tests
		uploadDir: process.env.UPLOAD_DIR || './test/uploads',
		defaultAdminUser: {
			email: 'test@shecaresmarket.com',
			password: 'testPassword123!'
		}
	},
	production: {
		env: 'production',
		name: 'SheCares Market API',
		version: '1.0.0',
		port: parseInt(process.env.PORT || '8080', 10),
		baseUrl: process.env.BASE_URL,
		clientUrl: process.env.CLIENT_URL,
		cors: {
			origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
			credentials: true
		},
		serveStaticFiles: true,
		enableApiDocs: process.env.ENABLE_API_DOCS === 'true' || false,
		docsUrl: '/api-docs',
		logLevel: 'info',
		uploadDir: process.env.UPLOAD_DIR || './uploads',
		defaultAdminUser: {
			email: process.env.DEFAULT_ADMIN_EMAIL,
			password: process.env.DEFAULT_ADMIN_PASSWORD
		}
	}
};

module.exports = appConfig[env];