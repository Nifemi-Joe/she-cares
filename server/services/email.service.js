// src/services/email.service.js

const nodemailer = require('nodemailer');
const emailConfig = require('../config/email.config');
const { AppError } = require('../utils/error-handler');
const logger = require('../infrastructure/logging/logger');

/**
 * @class EmailService
 * @description Service for sending emails
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class EmailService {
	constructor() {
		this.transporter = null;
		this.retryCount = 0;
		this.maxRetries = 3;
		this._initializeTransporter();
	}

	/**
	 * Initialize email transporter with retry logic
	 * @private
	 */
	async _initializeTransporter() {
		try {
			this.transporter = await this._createTransporter();
			// Verify connection
			await this._verifyConnection();
		} catch (error) {
			logger.error(`Failed to initialize email transporter: ${error.message}`);
			if (this.retryCount < this.maxRetries) {
				this.retryCount++;
				setTimeout(() => this._initializeTransporter(), 5000); // Retry after 5 seconds
			}
		}
	}

	/**
	 * Send an email with retry logic
	 * @param {Object} emailData - Email data
	 * @param {string|string[]} emailData.to - Recipient(s)
	 * @param {string} [emailData.from] - Sender (defaults to config)
	 * @param {string} emailData.subject - Email subject
	 * @param {string} [emailData.text] - Plain text body
	 * @param {string} [emailData.html] - HTML body
	 * @param {Array} [emailData.attachments] - Email attachments
	 * @returns {Promise<Object>} Send result
	 */
	async sendEmail(emailData, retryAttempt = 0) {
		try {
			const { to, from = emailConfig.config.from.email, subject, text, html, attachments } = emailData;

			if (!to || !subject || (!text && !html)) {
				throw new AppError('Missing required email fields', 400);
			}

			// Check if in log-only mode
			if (emailConfig.config.logOnly) {
				logger.info(`[EMAIL LOG ONLY] Would send email to: ${to}, subject: ${subject}`);
				return { messageId: 'log-only-mode', accepted: [to] };
			}

			// Ensure transporter is available
			if (!this.transporter) {
				await this._initializeTransporter();
				if (!this.transporter) {
					throw new Error('Email transporter not initialized');
				}
			}

			const mailOptions = {
				from,
				to: Array.isArray(to) ? to.join(', ') : to,
				subject,
				text,
				html,
				attachments
			};

			const info = await this.transporter.sendMail(mailOptions);
			logger.info(`Email sent successfully: ${info.messageId} to ${to}`);
			return info;

		} catch (error) {
			logger.error(`Error sending email (attempt ${retryAttempt + 1}): ${error.message}`);

			// Check if it's a socket error and we should retry
			if (this._shouldRetryError(error) && retryAttempt < this.maxRetries) {
				logger.info(`Retrying email send in 5 seconds... (attempt ${retryAttempt + 2})`);

				// Recreate transporter on socket errors
				if (error.message.includes('socket') || error.message.includes('connection')) {
					this.transporter = null;
					await this._initializeTransporter();
				}

				await this._delay(5000); // Wait 5 seconds before retry
				return this.sendEmail(emailData, retryAttempt + 1);
			}

			throw new AppError(`Failed to send email after ${retryAttempt + 1} attempts: ${error.message}`, 500);
		}
	}

	/**
	 * Send a template-based email
	 * @param {Object} options - Email options
	 * @param {string|string[]} options.to - Recipient(s)
	 * @param {string} options.subject - Email subject
	 * @param {string} options.template - Template name
	 * @param {Object} options.data - Template data
	 * @param {Array} [options.attachments] - Email attachments
	 * @returns {Promise<Object>} Send result
	 */
	async sendTemplateEmail(options) {
		try {
			const { to, subject, template, data, attachments } = options;

			// In a real application, you would use a templating engine here
			// For now, we'll use a simple placeholder replacement
			const htmlContent = this._renderTemplate(template, data);

			return this.sendEmail({
				to,
				subject,
				html: htmlContent,
				attachments
			});
		} catch (error) {
			logger.error(`Error sending template email: ${error.message}`);
			throw new AppError(`Failed to send template email: ${error.message}`, 500);
		}
	}

	/**
	 * Send order confirmation email
	 * @param {Object} order - Order details
	 * @param {Object} client - Client details
	 * @param {Buffer} [invoicePdf] - Invoice PDF buffer
	 * @returns {Promise<Object>} Send result
	 */
	async sendOrderConfirmation(order, client, invoicePdf) {
		if (!client.email) {
			logger.warn(`Cannot send order confirmation: no email for client ${client.id}`);
			return null;
		}

		const attachments = [];
		if (invoicePdf) {
			attachments.push({
				filename: `Invoice-${order.orderNumber}.pdf`,
				content: invoicePdf
			});
		}

		const subject = `Order Confirmation #${order.orderNumber} - ${emailConfig.config.from.name}`;
		const text = this._generateOrderConfirmationText(order, client);

		return this.sendEmail({
			to: client.email,
			subject,
			text,
			attachments
		});
	}

	/**
	 * Send delivery notification email
	 * @param {Object} delivery - Delivery details
	 * @param {Object} order - Order details
	 * @param {Object} client - Client details
	 * @returns {Promise<Object>} Send result
	 */
	async sendDeliveryNotification(delivery, order, client) {
		if (!client.email) {
			logger.warn(`Cannot send delivery notification: no email for client ${client.id}`);
			return null;
		}

		const subject = `Delivery Update for Order #${order.orderNumber} - ${emailConfig.config.from.name}`;
		const text = this._generateDeliveryNotificationText(delivery, order);

		return this.sendEmail({
			to: client.email,
			subject,
			text
		});
	}

	/**
	 * Send password reset email
	 * @param {Object} user - User details
	 * @param {string} resetToken - Password reset token
	 * @param {string} resetUrl - Password reset URL
	 * @returns {Promise<Object>} Send result
	 */
	async sendPasswordReset(user, resetToken, resetUrl) {
		const subject = `Password Reset - ${emailConfig.config.from.name}`;
		const text = `
Hello ${user.fullName},

You requested a password reset. Please use the following link to reset your password:
${resetUrl}?token=${resetToken}

This link will expire in 1 hour.

If you did not request this, please ignore this email and your password will remain unchanged.

Regards,
${emailConfig.config.from.name} Team
`;

		return this.sendEmail({
			to: user.email,
			subject,
			text
		});
	}

	/**
	 * Verify email connection
	 * @returns {Promise<boolean>} Connection status
	 * @private
	 */
	async _verifyConnection() {
		if (!this.transporter) return false;

		try {
			await this.transporter.verify();
			logger.info('Email transporter connection verified successfully');
			return true;
		} catch (error) {
			logger.error(`Email transporter verification failed: ${error.message}`);
			return false;
		}
	}

	/**
	 * Create email transporter
	 * @returns {Object} Nodemailer transporter
	 * @private
	 */
	_createTransporter() {
		const config = emailConfig.config;

		// Create transporter with enhanced configuration
		const transporterConfig = {
			host: config.host,
			port: config.port,
			secure: config.secure,
			requireTLS: config.requireTLS || false,
			auth: {
				user: config.auth.user,
				pass: config.auth.pass
			},
			// Enhanced connection settings
			connectionTimeout: config.connectionTimeout || 60000,
			greetingTimeout: config.greetingTimeout || 30000,
			socketTimeout: config.socketTimeout || 60000,
			pool: config.pool || true,
			maxConnections: config.maxConnections || 5,
			maxMessages: config.maxMessages || 100,
			rateLimit: config.rateLimit || 14
		};

		logger.info(`Creating email transporter with host: ${config.host}:${config.port}`);
		return nodemailer.createTransport(transporterConfig);
	}

	/**
	 * Check if error should trigger a retry
	 * @param {Error} error - The error to check
	 * @returns {boolean} Whether to retry
	 * @private
	 */
	_shouldRetryError(error) {
		const retryableErrors = [
			'socket',
			'timeout',
			'ECONNRESET',
			'ENOTFOUND',
			'ECONNREFUSED',
			'Unexpected socket close'
		];

		return retryableErrors.some(errorType =>
			error.message.toLowerCase().includes(errorType.toLowerCase())
		);
	}

	/**
	 * Delay execution
	 * @param {number} ms - Milliseconds to delay
	 * @returns {Promise} Promise that resolves after delay
	 * @private
	 */
	_delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Generate order confirmation text
	 * @param {Object} order - Order object
	 * @param {Object} client - Client object
	 * @returns {string} Order confirmation text
	 * @private
	 */
	_generateOrderConfirmationText(order, client) {
		const date = new Date(order.createdAt).toLocaleDateString();
		const items = order.items.map(item => `${item.quantity} x ${item.product.name} - ₦${item.price * item.quantity}`).join('\n    ');

		return `
Hello ${client.name},

Thank you for your order with ${emailConfig.config.from.name}!

## Order Details:

Order Number: ${order.orderNumber}
Date: ${date}
Delivery Method: ${order.deliveryMethod}

## Items:

${items}

Subtotal: ₦${order.subtotal}
${order.deliveryFee ? `Delivery Fee: ₦${order.deliveryFee}` : ''}
${order.discount ? `Discount: ₦${order.discount}` : ''}
Total: ₦${order.totalAmount}

${order.deliveryMethod === 'delivery' ? `
Delivery Address:
-----------------

${order.deliveryAddress.street}
${order.deliveryAddress.city}, ${order.deliveryAddress.state}
${order.deliveryAddress.country}
`:`
Pickup Information:
-------------------

You can pick up your order at our location.
`}

## Payment Information:

Please transfer the total amount to:
Bank: ${process.env.BANK_NAME || 'Your Bank'}
Account Number: ${process.env.ACCOUNT_NUMBER || 'Your Account Number'}
Account Name: ${process.env.ACCOUNT_NAME || 'Your Account Name'}

Thank you for shopping with us!

Regards,
${emailConfig.config.from.name} Team
`;
	}

	/**
	 * Generate delivery notification text
	 * @param {Object} delivery - Delivery object
	 * @param {Object} order - Order object
	 * @returns {string} Delivery notification text
	 * @private
	 */
	_generateDeliveryNotificationText(delivery, order) {
		let statusMessage = '';

		switch (delivery.status) {
			case 'processing':
				statusMessage = 'Your order is being processed for delivery.';
				break;
			case 'out_for_delivery':
				statusMessage = 'Your order is out for delivery and should arrive soon.';
				break;
			case 'delivered':
				statusMessage = 'Your order has been delivered. Thank you for shopping with us!';
				break;
			case 'failed':
				statusMessage = 'We encountered an issue delivering your order. Our team will contact you shortly.';
				break;
			default:
				statusMessage = `Your order delivery status is: ${delivery.status}.`;
		}

		return `
Hello,

Update on your order #${order.orderNumber}:

${statusMessage}

${delivery.scheduledDate ? `Scheduled delivery date: ${new Date(delivery.scheduledDate).toLocaleDateString()}
${delivery.timeSlot ? `Time slot: ${delivery.timeSlot}` : ''}
` : ''}

${delivery.notes ? `Additional Notes: ${delivery.notes}` : ''}

If you have any questions, please contact us.

Regards,
${emailConfig.config.from.name} Team
`;
	}

	/**
	 * Simple template renderer
	 * @param {string} template - Template name
	 * @param {Object} data - Template data
	 * @returns {string} Rendered HTML
	 * @private
	 */
	_renderTemplate(template, data) {
		// In a real application, you would use a proper templating engine like Handlebars or EJS
		// This is a simplified version for demonstration
		let content = '';

		switch (template) {
			case 'order-confirmation':
				content = `
<h1>Order Confirmation</h1>
<p>Dear ${data.clientName},</p>
<p>Thank you for your order #${data.orderNumber}.</p>
<p>Total: ₦${data.total}</p>
`;
				break;
			case 'password-reset':
				content = `
<h1>Password Reset</h1>
<p>Dear ${data.userName},</p>
<p>Click <a href="${data.resetUrl}">here</a> to reset your password.</p>
`;
				break;
			default:
				content = '<p>No template content available.</p>';
		}

		return content;
	}
}

module.exports = new EmailService();