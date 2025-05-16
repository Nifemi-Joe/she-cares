// src/utils/error-handler.js

/**
 * @class AppError
 * @description Base error class for application errors
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class AppError extends Error {
	constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
		this.isOperational = true; // Used to distinguish operational errors from programming errors

		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * @class ValidationError
 * @description Error thrown when validation fails
 */
class ValidationError extends AppError {
	constructor(message, details = null) {
		super(message, 400, 'VALIDATION_ERROR');
		this.details = details; // For specific validation error details
	}
}

/**
 * @class NotFoundError
 * @description Error thrown when a resource is not found
 */
class NotFoundError extends AppError {
	constructor(message = 'Resource not found') {
		super(message, 404, 'NOT_FOUND');
	}
}

/**
 * @class AuthenticationError
 * @description Error thrown when authentication fails
 */
class AuthenticationError extends AppError {
	constructor(message = 'Authentication failed') {
		super(message, 401, 'AUTHENTICATION_ERROR');
	}
}

/**
 * @class AuthorizationError
 * @description Error thrown when user doesn't have permission
 */
class AuthorizationError extends AppError {
	constructor(message = 'Not authorized to perform this action') {
		super(message, 403, 'AUTHORIZATION_ERROR');
	}
}

/**
 * @class DatabaseError
 * @description Error thrown when database operations fail
 */
class DatabaseError extends AppError {
	constructor(message = 'Database operation failed') {
		super(message, 500, 'DATABASE_ERROR');
	}
}

/**
 * @class ConflictError
 * @description Error thrown when a conflict occurs (e.g., duplicate entry)
 */
class ConflictError extends AppError {
	constructor(message = 'Resource conflict') {
		super(message, 409, 'CONFLICT_ERROR');
	}
}

/**
 * @class APIError
 * @description Error thrown when communicating with external APIs
 */
class APIError extends AppError {
	constructor(message = 'External API error', statusCode = 502) {
		super(message, statusCode, 'API_ERROR');
	}
}

/**
 * @function handleError
 * @description Global error handler for express
 */
const handleError = (err, req, res, next) => {
	// Log error
	console.error('Error:', err);

	// Determine if error is trusted operational error or unknown error
	if (err.isOperational) {
		// Send operational error details to client
		return res.status(err.statusCode).json({
			status: 'error',
			code: err.code,
			message: err.message,
			details: err.details || undefined
		});
	}

	// For programming or unknown errors, send a generic message
	// This prevents leaking sensitive details to the client
	return res.status(500).json({
		status: 'error',
		code: 'INTERNAL_SERVER_ERROR',
		message: 'Something went wrong'
	});
};

/**
 * @function asyncHandler
 * @description Wrapper for async route handlers to catch errors
 */
const asyncHandler = (fn) => {
	return (req, res, next) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
};

/**
 * @function errorConverter
 * @description Convert non-AppError errors to AppError
 */
const errorConverter = (err, req, res, next) => {
	let convertedError = err;

	if (!(err instanceof AppError)) {
		const statusCode = err.statusCode || 500;
		const message = err.message || 'Something went wrong';
		const code = err.code || 'INTERNAL_SERVER_ERROR';

		convertedError = new AppError(message, statusCode, code);
	}

	next(convertedError);
};

module.exports = {
	AppError,
	ValidationError,
	NotFoundError,
	AuthenticationError,
	AuthorizationError,
	DatabaseError,
	ConflictError,
	APIError,
	handleError,
	asyncHandler,
	errorConverter
};