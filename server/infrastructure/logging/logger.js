// src/infrastructure/logging/logger.js

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../../config/app.config');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
	fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
	const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
	return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
});

/**
 * Custom logger implementation using Winston
 * @description Provides standardized logging across the application
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class Logger {
	constructor() {
		this.logger = this._createLogger();
	}

	/**
	 * Log info message
	 * @param {string} message - Log message
	 * @param {Object} meta - Additional metadata
	 */
	info(message, meta = {}) {
		this.logger.info(message, meta);
	}

	/**
	 * Log warning message
	 * @param {string} message - Log message
	 * @param {Object} meta - Additional metadata
	 */
	warn(message, meta = {}) {
		this.logger.warn(message, meta);
	}

	/**
	 * Log error message
	 * @param {string} message - Log message
	 * @param {Error|Object} error - Error object or metadata
	 */
	error(message, error = {}) {
		// Handle Error objects specially
		if (error instanceof Error) {
			this.logger.error(message, {
				error: {
					name: error.name,
					message: error.message,
					stack: error.stack
				}
			});
		} else {
			this.logger.error(message, error);
		}
	}

	/**
	 * Log debug message
	 * @param {string} message - Log message
	 * @param {Object} meta - Additional metadata
	 */
	debug(message, meta = {}) {
		this.logger.debug(message, meta);
	}

	/**
	 * Log HTTP request
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Object} meta - Additional metadata
	 */
	httpRequest(req, res, meta = {}) {
		this.logger.http(`${req.method} ${req.originalUrl}`, {
			method: req.method,
			url: req.originalUrl,
			ip: req.ip,
			statusCode: res.statusCode,
			responseTime: meta.responseTime,
			userAgent: req.get('User-Agent'),
			...meta
		});
	}

	/**
	 * Log application startup
	 * @param {Object} details - Startup details
	 */
	appStartup(details = {}) {
		this.logger.info(`Application started successfully`, {
			environment: config.environment,
			version: config.version,
			...details
		});
	}

	/**
	 * Create Winston logger instance
	 * @returns {winston.Logger} Winston logger
	 * @private
	 */
	_createLogger() {
		return winston.createLogger({
			level: config.logLevel || 'info',
			format: winston.format.combine(
				winston.format.timestamp({
					format: 'YYYY-MM-DD HH:mm:ss'
				}),
				winston.format.errors({ stack: true }),
				winston.format.splat(),
				winston.format.json()
			),
			defaultMeta: {
				service: config.appName || 'sheCares-api',
				environment: config.environment || 'development'
			},
			transports: [
				// Console transport for all environments
				new winston.transports.Console({
					format: winston.format.combine(
						winston.format.colorize(),
						winston.format.timestamp({
							format: 'YYYY-MM-DD HH:mm:ss'
						}),
						logFormat
					)
				}),

				// File transport - all logs
				new winston.transports.File({
					filename: path.join(logsDir, 'combined.log'),
					maxsize: 5242880, // 5MB
					maxFiles: 5
				}),

				// File transport - error logs only
				new winston.transports.File({
					filename: path.join(logsDir, 'errors.log'),
					level: 'error',
					maxsize: 5242880, // 5MB
					maxFiles: 5
				})
			],
			// Don't exit on handled exceptions
			exitOnError: false
		});
	}
}

// Create and export a singleton instance
const logger = new Logger();
module.exports = logger;