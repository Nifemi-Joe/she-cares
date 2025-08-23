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
	 * Send OTP verification email
	 * @param {Object} user - User object
	 * @param {string} otp - OTP code
	 * @returns {Promise<Object>} Send result
	 */
	async sendOTPVerification(user, otp) {
		const subject = `Verify Your Account - ${emailConfig.config.from.name}`;
		const html = this._generateOTPEmailHTML(user, otp);
		const text = this._generateOTPEmailText(user, otp);

		return this.sendEmail({
			to: user.email,
			subject,
			html,
			text
		});
	}

	/**
	 * Send welcome email after verification
	 * @param {Object} user - User object
	 * @returns {Promise<Object>} Send result
	 */
	async sendWelcomeEmail(user) {
		const subject = `Welcome to ${emailConfig.config.from.name}!`;
		const html = this._generateWelcomeEmailHTML(user);
		const text = this._generateWelcomeEmailText(user);

		return this.sendEmail({
			to: user.email,
			subject,
			html,
			text
		});
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
	 * Generate OTP verification email HTML
	 * @param {Object} user - User object
	 * @param {string} otp - OTP code
	 * @returns {string} HTML email content
	 * @private
	 */
	_generateOTPEmailHTML(user, otp) {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Account</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            margin: 20px;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }
        .content {
            padding: 40px 30px;
        }
        .otp-container {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            text-align: center;
            padding: 30px;
            margin: 30px 0;
            border-radius: 10px;
        }
        .otp-code {
            font-size: 48px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 10px 0;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .otp-label {
            font-size: 16px;
            margin-bottom: 10px;
            opacity: 0.9;
        }
        .info-box {
            background-color: #e8f4fd;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
        .warning-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            margin: 20px 0;
            font-weight: 500;
            transition: transform 0.3s ease;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .social-links {
            margin: 20px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Welcome to ${emailConfig.config.from.name}!</h1>
            <p>Please verify your email address</p>
        </div>
        
        <div class="content">
            <h2>Hello ${user.name || 'there'}! 👋</h2>
            <p>Thank you for registering with <strong>${emailConfig.config.from.name}</strong>. To complete your registration and activate your account, please use the verification code below:</p>
            
            <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div>Valid for 10 minutes</div>
            </div>
            
            <div class="info-box">
                <h3>📱 How to verify:</h3>
                <ol>
                    <li>Go back to the verification page</li>
                    <li>Enter the 6-digit code above</li>
                    <li>Click "Verify Account"</li>
                </ol>
            </div>
            
            <div class="warning-box">
                <h3>⚠️ Important Notes:</h3>
                <ul>
                    <li>This code will expire in <strong>10 minutes</strong></li>
                    <li>Don't share this code with anyone</li>
                    <li>If you didn't request this, please ignore this email</li>
                </ul>
            </div>
            
            <p>If you're having trouble with verification, feel free to contact our support team.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>
            The ${emailConfig.config.from.name} Team</p>
            
            <div class="social-links">
                <a href="#">Help Center</a> |
                <a href="#">Contact Support</a> |
                <a href="#">Privacy Policy</a>
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
                This is an automated email. Please do not reply to this message.
            </p>
        </div>
    </div>
</body>
</html>
		`;
	}

	/**
	 * Generate OTP verification email text
	 * @param {Object} user - User object
	 * @param {string} otp - OTP code
	 * @returns {string} Plain text email content
	 * @private
	 */
	_generateOTPEmailText(user, otp) {
		return `
Hello ${user.name || 'there'},

Thank you for registering with ${emailConfig.config.from.name}!

To complete your registration, please use the following verification code:

VERIFICATION CODE: ${otp}

This code is valid for 10 minutes. Please enter it on the verification page to activate your account.

Important:
- Do not share this code with anyone
- If you didn't request this verification, please ignore this email
- For support, contact our team

Best regards,
The ${emailConfig.config.from.name} Team

---
This is an automated email. Please do not reply.
		`;
	}

	/**
	 * Generate welcome email HTML
	 * @param {Object} user - User object
	 * @returns {string} HTML email content
	 * @private
	 */
	_generateWelcomeEmailHTML(user) {
		return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${emailConfig.config.from.name}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            margin: 20px;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 300;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 30px;
            margin: 30px 0;
            border-radius: 10px;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .feature-item {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #667eea;
        }
        .feature-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            margin: 20px 10px;
            font-weight: 500;
            transition: transform 0.3s ease;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🎉 Welcome Aboard!</h1>
            <p>Your account has been successfully verified</p>
        </div>
        
        <div class="content">
            <div class="welcome-box">
                <h2>Hello ${user.name}!</h2>
                <p>Welcome to ${emailConfig.config.from.name}. We're excited to have you on board!</p>
            </div>
            
            <p>Your account has been successfully verified and activated. You can now access all features of our platform.</p>
            
            <div class="feature-grid">
                <div class="feature-item">
                    <div class="feature-icon">👤</div>
                    <h3>Profile Management</h3>
                    <p>Update your personal information and preferences</p>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">📊</div>
                    <h3>Dashboard</h3>
                    <p>Access your personalized dashboard and analytics</p>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">🔒</div>
                    <h3>Security</h3>
                    <p>Manage your account security settings</p>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">📧</div>
                    <h3>Notifications</h3>
                    <p>Stay updated with email and app notifications</p>
                </div>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="#" class="button">Get Started</a>
                <a href="#" class="button" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">Explore Features</a>
            </div>
            
            <h3>Need Help?</h3>
            <p>If you have any questions or need assistance, our support team is here to help:</p>
            <ul>
                <li>📧 Email: support@${emailConfig.config.from.name.toLowerCase().replace(/\s+/g, '')}.com</li>
                <li>📞 Phone: +1 (555) 123-4567</li>
                <li>💬 Live Chat: Available 24/7 on our website</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing ${emailConfig.config.from.name}!</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
                This email was sent to ${user.email}. If you have any questions, contact our support team.
            </p>
        </div>
    </div>
</body>
</html>
		`;
	}

	/**
	 * Generate welcome email text
	 * @param {Object} user - User object
	 * @returns {string} Plain text email content
	 * @private
	 */
	_generateWelcomeEmailText(user) {
		return `
Hello ${user.name}!

Welcome to ${emailConfig.config.from.name}! 🎉

Your account has been successfully verified and activated. We're excited to have you on board!

What's Next?
- Complete your profile setup
- Explore our dashboard and features
- Customize your notification preferences
- Start using all available tools

Need Help?
Our support team is here to assist you:
- Email: support@${emailConfig.config.from.name.toLowerCase().replace(/\s+/g, '')}.com
- Phone: +1 (555) 123-4567
- Live Chat: Available 24/7 on our website

Thank you for choosing ${emailConfig.config.from.name}!

Best regards,
The ${emailConfig.config.from.name} Team

---
This email was sent to ${user.email}
		`;
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