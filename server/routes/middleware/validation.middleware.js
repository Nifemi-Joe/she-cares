// src/api/middlewares/validation.middleware.js

const { ValidationError } = require('../../utils/error-handler');

/**
 * Validate request data against a validator method
 * @param {Function} validatorMethod - Validator method
 * @param {String} source - Request property to validate ('body', 'query', 'params')
 */
const validate = (validatorMethod, source = 'body') => {
	return (req, res, next) => {
		try {
			const data = req[source];

			// Check if validatorMethod is a function or method
			if (typeof validatorMethod !== 'function') {
				throw new Error('Invalid validator: must be a function');
			}

			// Call the validator method (which should return {isValid, errors})
			const validationResult = validatorMethod(data);

			// If using Joi schema, handle that format
			if (validationResult.error) {
				const errorMessage = validationResult.error.details
					? validationResult.error.details.map(detail => detail.message).join(', ')
					: 'Validation error';

				throw new ValidationError(errorMessage);
			}

			// If using our custom validator format
			if (validationResult.isValid === false) {
				throw new ValidationError(
					typeof validationResult.errors === 'string'
						? validationResult.errors
						: JSON.stringify(validationResult.errors)
				);
			}

			// Replace request data with validated data if present
			if (validationResult.value) {
				req[source] = validationResult.value;
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

/**
 * Validate specific fields in the request
 * @param {Object} fields - Object with field names and their validator functions
 * @param {String} source - Request property to validate ('body', 'query', 'params')
 */
const validateFields = (fields, source = 'body') => {
	return (req, res, next) => {
		try {
			const data = req[source];
			const errors = [];

			// Validate each field
			Object.keys(fields).forEach(fieldName => {
				if (data && data[fieldName] !== undefined) {
					const validator = fields[fieldName];
					const result = validator(data[fieldName]);

					if (!result.valid) {
						errors.push(`${fieldName}: ${result.message}`);
					}
				}
			});

			if (errors.length > 0) {
				throw new ValidationError(errors.join(', '));
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id', source = 'params') => {
	return (req, res, next) => {
		try {
			const id = req[source][paramName];

			// Basic check for MongoDB ObjectId format (24 hex characters)
			const objectIdRegex = /^[0-9a-fA-F]{24}$/;

			if (!id || !objectIdRegex.test(id)) {
				throw new ValidationError(`Invalid ${paramName} format`);
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
	try {
		const { page, limit } = req.query;

		// Convert to numbers and validate
		if (page !== undefined) {
			const pageNum = parseInt(page, 10);
			if (isNaN(pageNum) || pageNum < 1) {
				throw new ValidationError('Page must be a positive integer');
			}
			req.query.page = pageNum;
		}

		if (limit !== undefined) {
			const limitNum = parseInt(limit, 10);
			if (isNaN(limitNum) || limitNum < 1) {
				throw new ValidationError('Limit must be a positive integer');
			}
			req.query.limit = limitNum;
		}

		next();
	} catch (error) {
		next(error);
	}
};

module.exports = {
	validate,
	validateFields,
	validateObjectId,
	validatePagination
};