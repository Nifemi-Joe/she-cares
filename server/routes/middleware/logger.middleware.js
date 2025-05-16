// src/api/middlewares/logger.middleware.js

const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../infrastructure/logging/logger');

/**
 * Request logging middleware
 * Logs incoming requests and outgoing responses
 */
const requestLogger = (req, res, next) => {
	// Generate unique request ID
	req.id = req.headers['x-request-id'] || uuidv4();
	res.setHeader('X-Request-Id', req.id);

	// Get request start time
	const start = Date.now();

	// Log request
	logger.info({
		type: 'request',
		requestId: req.id,
		method: req.method,
		path: req.originalUrl,
		ip: req.ip,
		userAgent: req.headers['user-agent'],
		timestamp: new Date().toISOString()
	});

	// Store original response end method
	const originalEnd = res.end;

	// Override response end method
	res.end = function(chunk, encoding) {
		// Calculate response time
		const responseTime = Date.now() - start;

		// Restore original end method
		res.end = originalEnd;

		// Call original end method
		res.end(chunk, encoding);

		// Log response
		logger.info({
			type: 'response',
			requestId: req.id,
			method: req.method,
			path: req.originalUrl,
			statusCode: res.statusCode,
			responseTime: `${responseTime}ms`,
			contentLength: res.getHeader('content-length') || 0,
			timestamp: new Date().toISOString()
		});
	};

	next();
};

/**
 * API activity tracking middleware
 * Logs detailed information about API usage
 */
const apiActivityLogger = (req, res, next) => {
	// Skip logging for certain paths (e.g., health checks, static resources)
	const skipPaths = ['/api/health', '/api/metrics', '/favicon.ico'];
	if (skipPaths.some(path => req.path.startsWith(path))) {
		return next();
	}

	// Extract user information if available
	const user = req.user ? {
		id: req.user.id,
		email: req.user.email,
		role: req.user.role
	} : null;

	// Log API activity
	logger.info({
		type: 'api_activity',
		requestId: req.id,
		user,
		method: req.method,
		path: req.originalUrl,
		query: req.query,
		// Don't log sensitive information
		body: sanitizeRequestBody(req.body),
		timestamp: new Date().toISOString()
	});

	next();
};

/**
 * Remove sensitive data from request body
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'credit_card', 'cardNumber'];

function sanitizeRequestBody(body) {
	if (!body) return {};

	// Create a copy of the body
	const sanitized = { ...body };

	// Mask sensitive fields
	sensitiveFields.forEach(field => {
		if (sanitized[field]) {
			sanitized[field] = '[REDACTED]';
		}
	});

	return sanitized;
}

module.exports = {
	requestLogger,
	apiActivityLogger
};