// src/services/email.service.js

const nodemailer = require('nodemailer');
const config = require('../config/email.config');
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
		this.transporter = this._createTransporter();
	}

	/**
	 * Send an email
	 * @param {Object} emailData - Email data
	 * @param {string|string[]} emailData.to - Recipient(s)
	 * @param {string} [emailData.from] - Sender (defaults to config)
	 * @param {string} emailData.subject - Email subject
	 * @param {string} [emailData.text] - Plain text body
	 * @param {string} [emailData.html] - HTML body
	 * @param {Array} [emailData.attachments] - Email attachments
	 * @returns {Promise<Object>} Send result
	 */
	async sendEmail(emailData) {
		try {
			const { to, from = config.defaultFrom, subject, text, html, attachments } = emailData;

			if (!to || !subject || (!text && !html)) {
				throw new AppError('Missing required email fields', 400);
			}

			const mailOptions = {
				from,
				to,
				subject,
				text,
				html,
				attachments
			};

			const info = await this.transporter.sendMail(mailOptions);
			logger.info(`Email sent: ${info.messageId}`);
			return info;
		} catch (error) {
			logger.error(`Error sending email: ${error.message}`);
			throw new AppError(`Failed to send email: ${error.message}`, 500);
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

		const subject = `Order Confirmation #${order.orderNumber} - ${config.businessName}`;
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

		const subject = `Delivery Update for Order #${order.orderNumber} - ${config.businessName}`;
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
		const subject = `Password Reset - ${config.businessName}`;
		const text = `
      Hello ${user.fullName},

      You requested a password reset. Please use the following link to reset your password:
      ${resetUrl}?token=${resetToken}

      This link will expire in 1 hour.

      If you did not request this, please ignore this email and your password will remain unchanged.

      Regards,
      ${config.businessName} Team
    `;

		return this.sendEmail({
			to: user.email,
			subject,
			text
		});
	}

	/**
	 * Create email transporter
	 * @returns {Object} Nodemailer transporter
	 * @private
	 */
	_createTransporter() {
		// For development, use a test account or ethereal
		if (config.useTestAccount) {
			return nodemailer.createTransport({
				host: 'smtp.ethereal.email',
				port: 587,
				secure: false,
				auth: {
					user: config.auth.user,
					pass: config.auth.pass
				}
			});
		}

		// For production
		return nodemailer.createTransport({
			host: config.host,
			port: config.port,
			secure: config.secure,
			auth: {
				user: config.auth.user,
				pass: config.auth.pass
			}
		});
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

      Thank you for your order with ${config.businessName}!

      Order Details:
      --------------
      Order Number: ${order.orderNumber}
      Date: ${date}
      Delivery Method: ${order.deliveryMethod}
      
      Items:
      ------
      ${items}
      
      Subtotal: ₦${order.subtotal}
      ${order.deliveryFee ? `Delivery Fee: ₦${order.deliveryFee}` : ''}
      ${order.discount ? `Discount: ₦${order.discount}` : ''}
      Total: ₦${order.totalAmount}
      
      ${order.deliveryMethod === 'delivery' ? `
      Delivery Address:
      ----------------
      ${order.deliveryAddress.street}
      ${order.deliveryAddress.city}, ${order.deliveryAddress.state}
      ${order.deliveryAddress.country}
      ` : `
      Pickup Information:
      ------------------
      You can pick up your order at our location.
      `}
      
      Payment Information:
      -------------------
      Please transfer the total amount to:
      Bank: ${config.bankDetails.bankName}
      Account Number: ${config.bankDetails.accountNumber}
      Account Name: ${config.bankDetails.accountName}
      
      Thank you for shopping with us!
      
      Regards,
      ${config.businessName} Team
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
      
      ${delivery.scheduledDate ? `
      Scheduled delivery date: ${new Date(delivery.scheduledDate).toLocaleDateString()}
      ${delivery.timeSlot ? `Time slot: ${delivery.timeSlot}` : ''}
      ` : ''}
      
      ${delivery.notes ? `Additional Notes: ${delivery.notes}` : ''}
      
      If you have any questions, please contact us.

      Regards,
      ${config.businessName} Team
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