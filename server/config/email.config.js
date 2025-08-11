/**
 * Email configuration
 * @module config/email
 * @description Email service settings
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

const env = process.env.NODE_ENV;

/**
 * Email provider configuration
 */
const emailConfig = {
	development: {
		host: process.env.EMAIL_HOST,
		port: parseInt(process.env.EMAIL_PORT, 10),
		secure: false,
		requireTLS: true,
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS
		},
		from: {
			name: process.env.EMAIL_FROM_NAME,
			email: process.env.EMAIL_FROM_EMAIL
		},
		connectionTimeout: 60000,
		greetingTimeout: 30000,
		socketTimeout: 60000,
		pool: true,
		maxConnections: 5,
		maxMessages: 100,
		rateLimit: 14,
		logOnly: process.env.EMAIL_LOG_ONLY === 'true'
	},
	test: {
		host: process.env.EMAIL_HOST,
		port: parseInt(process.env.EMAIL_PORT, 10),
		secure: false,
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS
		},
		from: {
			name: process.env.EMAIL_FROM_NAME,
			email: process.env.EMAIL_FROM_EMAIL
		},
		logOnly: true
	},
	production: {
		host: process.env.EMAIL_HOST,
		port: parseInt(process.env.EMAIL_PORT, 10),
		secure: process.env.EMAIL_SECURE === 'true',
		requireTLS: true,
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS
		},
		from: {
			name: process.env.EMAIL_FROM_NAME,
			email: process.env.EMAIL_FROM_EMAIL
		},
		connectionTimeout: 60000,
		greetingTimeout: 30000,
		socketTimeout: 60000,
		pool: true,
		maxConnections: 5,
		maxMessages: 100,
		rateLimit: 14,
		logOnly: false
	}
};

/**
 * Email templates configuration
 */
const templates = {
	orderConfirmation: {
		subject: 'Order Confirmation - SheCares Market',
		template: 'order-confirmation'
	},
	invoice: {
		subject: 'Invoice #{invoiceNumber} - SheCares Market',
		template: 'invoice'
	},
	orderStatusUpdate: {
		subject: 'Order Status Update - SheCares Market',
		template: 'order-status-update'
	},
	welcome: {
		subject: 'Welcome to SheCares Market',
		template: 'welcome'
	},
	passwordReset: {
		subject: 'Password Reset - SheCares Market',
		template: 'password-reset'
	},
	accountVerification: {
		subject: 'Verify Your Account - SheCares Market',
		template: 'account-verification'
	}
};

/**
 * Email delivery settings
 */
const delivery = {
	retry: {
		enabled: true,
		maxAttempts: 3,
		delay: 15 * 60 * 1000
	},
	queue: {
		enabled: true,
		concurrentJobs: 5,
		jobTimeout: 30000
	}
};

module.exports = {
	config: emailConfig[env],
	templates,
	delivery
};