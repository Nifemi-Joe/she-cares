/**
 * Application configuration
 * @module config/app
 * @description Core application settings
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

const env = process.env.NODE_ENV;

/**
 * Application configuration by environment
 */
const appConfig = {
	development: {
		env: 'development',
		name: 'SheCares Market API',
		version: '1.0.0',
		port: parseInt(process.env.PORT, 10),
		baseUrl: process.env.BASE_URL,
		clientUrl: process.env.CLIENT_URL,
		cors: {
			origin: '*',
			credentials: true
		},
		serveStaticFiles: true,
		enableApiDocs: true,
		docsUrl: '/api-docs',
		logLevel: 'debug',
		uploadDir: process.env.UPLOAD_DIR,
		defaultAdminUser: {
			email: process.env.DEFAULT_ADMIN_EMAIL,
			password: process.env.DEFAULT_ADMIN_PASSWORD
		},
		businessName: 'She Cares',
		businessAddress: {
			street: "H91, Ikota Shopping Complex, VGC",
			city: "Lagos",
			country: "Nigeria"
		},
		businessPhone: "+2348023132369",
		businessEmail: "globalsjxinfo@gmail.com",
		paymentInfo: {
			bankName: 'First Bank',
			accountName: 'SheCares Foods',
			accountNumber: '0123456789',
			bankCode: '000000'
		}
	},
	test: {
		env: 'test',
		name: 'SheCares Market API (Test)',
		version: '1.0.0',
		port: parseInt(process.env.PORT, 10),
		baseUrl: process.env.BASE_URL,
		clientUrl: process.env.CLIENT_URL,
		cors: {
			origin: '*',
			credentials: true
		},
		serveStaticFiles: true,
		enableApiDocs: true,
		docsUrl: '/api-docs',
		logLevel: 'error',
		uploadDir: process.env.UPLOAD_DIR,
		defaultAdminUser: {
			email: 'test@shecaresmarket.com',
			password: 'testPassword123!'
		}
	},
	production: {
		env: 'production',
		name: 'SheCares Market API',
		version: '1.0.0',
		port: parseInt(process.env.PORT, 10),
		baseUrl: process.env.BASE_URL,
		clientUrl: process.env.CLIENT_URL,
		cors: {
			origin: '*',
			credentials: true
		},
		serveStaticFiles: true,
		enableApiDocs: process.env.ENABLE_API_DOCS === 'true',
		docsUrl: '/api-docs',
		logLevel: 'info',
		uploadDir: process.env.UPLOAD_DIR,
		defaultAdminUser: {
			email: process.env.DEFAULT_ADMIN_EMAIL,
			password: process.env.DEFAULT_ADMIN_PASSWORD
		}
	}
};

module.exports = appConfig[env];