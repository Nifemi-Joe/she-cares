// src/config/email.config.js

/**
 * Email configuration
 * @module config/email
 * @description Email service settings
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

const env = process.env.NODE_ENV || 'development';

/**
 * Email provider configuration
 */
const emailConfig = {
	development: {
		service: process.env.EMAIL_SERVICE || 'smtp',
		host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
		port: parseInt(process.env.EMAIL_PORT || '2525', 10),
		secure: process.env.EMAIL_SECURE === 'true' || false,
		auth: {
			user: process.env.EMAIL_USER || '',
			pass: process.env.EMAIL_PASS || ''
		},
		from: {
			name: process.env.EMAIL_FROM_NAME || 'SheCares Market (Dev)',
			email: process.env.EMAIL_FROM_EMAIL || 'dev@shecaresmarket.com'
		},
		// In development, log emails to console instead of sending
		logOnly: process.env.EMAIL_LOG_ONLY === 'true' || true
	},
	test: {
		service: process.env.EMAIL_SERVICE || 'smtp',
		host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
		port: parseInt(process.env.EMAIL_PORT || '2525', 10),
		secure: process.env.EMAIL_SECURE === 'true' || false,
		auth: {
			user: process.env.EMAIL_USER || '',
			pass: process.env.EMAIL_PASS || ''
		},
		from: {
			name: process.env.EMAIL_FROM_NAME || 'SheCares Market (Test)',
			email: process.env.EMAIL_FROM_EMAIL || 'test@shecaresmarket.com'
		},
		// In test environment, don't send actual emails
		logOnly: true
	},
	production: {
		service: process.env.EMAIL_SERVICE || 'smtp',
		host: process.env.EMAIL_HOST,
		port: parseInt(process.env.EMAIL_PORT || '587', 10),
		secure: process.env.EMAIL_SECURE === 'true' || false,
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS
		},
		from: {
			name: process.env.EMAIL_FROM_NAME || 'SheCares Market',
			email: process.env.EMAIL_FROM_EMAIL || 'no-reply@shecaresmarket.com'
		},
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
	// Retry sending failed emails
	retry: {
		enabled: true,
		maxAttempts: 3,
		delay: 15 * 60 * 1000 // 15 minutes
	},
	// Queue emails for better performance
	queue: {
		enabled: true,
		concurrentJobs: 5,
		jobTimeout: 30000 // 30 seconds
	}
};

module.exports = {
	config: emailConfig[env],
	templates,
	delivery
};