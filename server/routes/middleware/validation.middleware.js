// src/api/middlewares/validation.middleware.js

const { ValidationError } = require('../../utils/error-handler');

/**
 * Validate request data against a validator schema
 * @param {Function} validator - Validator function
 * @param {String} source - Request property to validate ('body', 'query', 'params')
 */
const validate = (validator, source = 'body') => {
	return (req, res, next) => {
		try {
			const data = req[source];
			const { error, value } = validator(data);

			if (error) {
				const errorMessage = error.details
					? error.details.map(detail => detail.message).join(', ')
					: 'Validation error';

				throw new ValidationError(errorMessage);
			}

			// Replace request data with validated data
			req[source] = value;
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