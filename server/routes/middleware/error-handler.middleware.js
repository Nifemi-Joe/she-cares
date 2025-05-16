// src/api/middlewares/error-handler.middleware.js

const { logger } = require('../../infrastructure/logging/logger');
const {
	BaseError,
	NotFoundError,
	ValidationError,
	AuthenticationError,
	ForbiddenError,
	ConflictError
} = require('../../utils/error-handler');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
	// Log the error
	logger.error({
		message: err.message,
		stack: err.stack,
		path: req.path,
		method: req.method,
		statusCode: err.statusCode || 500,
		requestId: req.id,
		timestamp: new Date().toISOString()
	});

	// Handle known errors
	if (err instanceof BaseError) {
		return res.status(err.statusCode).json({
			error: {
				status: err.statusCode,
				name: err.name,
				message: err.message,
				code: err.code || null,
				requestId: req.id
			}
		});
	}

	// Handle MongoDB validation errors
	if (err.name === 'ValidationError') {
		return res.status(400).json({
			error: {
				status: 400,
				name: 'ValidationError',
				message: Object.values(err.errors).map(e => e.message).join(', '),
				requestId: req.id
			}
		});
	}

	// Handle MongoDB duplicate key errors
	if (err.name === 'MongoError' && err.code === 11000) {
		return res.status(409).json({
			error: {
				status: 409,
				name: 'ConflictError',
				message: 'Duplicate entry found',
				requestId: req.id
			}
		});
	}

	// Handle JWT errors
	if (err.name === 'JsonWebTokenError') {
		return res.status(401).json({
			error: {
				status: 401,
				name: 'AuthenticationError',
				message: 'Invalid token',
				requestId: req.id
			}
		});
	}

	if (err.name === 'TokenExpiredError') {
		return res.status(401).json({
			error: {
				status: 401,
				name: 'AuthenticationError',
				message: 'Token expired',
				requestId: req.id
			}
		});
	}

	// Generic server error (hide details in production)
	const isProduction = process.env.NODE_ENV === 'production';

	return res.status(500).json({
		error: {
			status: 500,
			name: 'InternalServerError',
			message: isProduction ? 'An internal server error occurred' : err.message,
			requestId: req.id,
			...(isProduction ? {} : { stack: err.stack })
		}
	});
};

/**
 * 404 Not Found middleware
 */
const notFoundHandler = (req, res, next) => {
	const error = new NotFoundError(`Resource not found: ${req.method} ${req.originalUrl}`);
	next(error);
};

module.exports = {
	errorHandler,
	notFoundHandler
};