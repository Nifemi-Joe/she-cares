// src/domain/validators/user.validator.js

const Joi = require('joi');

/**
 * @class UserValidator
 * @description Validation schemas for user-related operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class UserValidator {
	constructor() {
		// Define schemas as instance properties
		this._registerSchema = Joi.object({
			name: Joi.string().min(3).max(100).required()
				.messages({
					'string.min': 'Full name must be at least 3 characters long',
					'string.max': 'Full name cannot exceed 100 characters',
					'any.required': 'Full name is required'
				}),

			email: Joi.string().email().required()
				.messages({
					'string.email': 'Please provide a valid email address',
					'any.required': 'Email is required'
				}),

			password: Joi.string().min(8).required()
				.pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
				.messages({
					'string.min': 'Password must be at least 8 characters long',
					'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
					'any.required': 'Password is required'
				}),

			confirmPassword: Joi.string().valid(Joi.ref('password')).required()
				.messages({
					'any.only': 'Passwords do not match',
					'any.required': 'Password confirmation is required'
				}),

			role: Joi.string().valid('admin', 'client').default('client')
				.messages({
					'any.only': 'Role must be either "admin" or "client"'
				}),

			phoneNumber: Joi.string().allow('').optional(),

			preferences: Joi.object({
				notifications: Joi.boolean().default(true),
				theme: Joi.string().valid('light', 'dark').default('light')
			}).optional()
		});

		this._verifyOTPSchema = Joi.object({
			email: Joi.string()
				.email()
				.required()
				.messages({
					'string.empty': 'Email is required',
					'string.email': 'Please provide a valid email address'
				}),

			otp: Joi.string()
				.length(6)
				.pattern(/^[0-9]+$/)
				.required()
				.messages({
					'string.empty': 'OTP is required',
					'string.length': 'OTP must be exactly 6 digits',
					'string.pattern.base': 'OTP must contain only numbers'
				})
		});

		this._resendOTPSchema = Joi.object({
			email: Joi.string()
				.email()
				.required()
				.messages({
					'string.empty': 'Email is required',
					'string.email': 'Please provide a valid email address'
				})
		});

		this._loginSchema = Joi.object({
			email: Joi.string().email().required()
				.messages({
					'string.email': 'Please provide a valid email address',
					'any.required': 'Email is required'
				}),

			password: Joi.string().required()
				.messages({
					'any.required': 'Password is required'
				})
		});

		this._updateProfileSchema = Joi.object({
			name: Joi.string().min(3).max(100).optional()
				.messages({
					'string.min': 'Full name must be at least 3 characters long',
					'string.max': 'Full name cannot exceed 100 characters'
				}),

			phoneNumber: Joi.string().allow('').optional(),

			preferences: Joi.object({
				notifications: Joi.boolean().optional(),
				theme: Joi.string().valid('light', 'dark').optional()
			}).optional()
		});

		this._changePasswordSchema = Joi.object({
			currentPassword: Joi.string().required()
				.messages({
					'any.required': 'Current password is required'
				}),

			newPassword: Joi.string().min(8).required()
				.pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
				.messages({
					'string.min': 'New password must be at least 8 characters long',
					'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
					'any.required': 'New password is required'
				}),

			confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required()
				.messages({
					'any.only': 'New passwords do not match',
					'any.required': 'New password confirmation is required'
				})
		});

		this._userStatusSchema = Joi.object({
			isActive: Joi.boolean().required()
				.messages({
					'any.required': 'Active status is required'
				})
		});

		this._adminCreateUserSchema = Joi.object({
			name: Joi.string().min(3).max(100).required()
				.messages({
					'string.min': 'Full name must be at least 3 characters long',
					'string.max': 'Full name cannot exceed 100 characters',
					'any.required': 'Full name is required'
				}),

			email: Joi.string().email().required()
				.messages({
					'string.email': 'Please provide a valid email address',
					'any.required': 'Email is required'
				}),

			password: Joi.string().min(8).required()
				.pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
				.messages({
					'string.min': 'Password must be at least 8 characters long',
					'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
					'any.required': 'Password is required'
				}),

			role: Joi.string().valid('admin', 'client').required()
				.messages({
					'any.only': 'Role must be either "admin" or "client"',
					'any.required': 'Role is required'
				}),

			phoneNumber: Joi.string().allow('').optional(),

			isActive: Joi.boolean().default(true),

			preferences: Joi.object({
				notifications: Joi.boolean().default(true),
				theme: Joi.string().valid('light', 'dark').default('light')
			}).optional()
		});

		this._adminUpdateUserSchema = Joi.object({
			name: Joi.string().min(3).max(100).optional()
				.messages({
					'string.min': 'Full name must be at least 3 characters long',
					'string.max': 'Full name cannot exceed 100 characters'
				}),

			role: Joi.string().valid('admin', 'client').optional()
				.messages({
					'any.only': 'Role must be either "admin" or "client"'
				}),

			phoneNumber: Joi.string().allow('').optional(),

			isActive: Joi.boolean().optional(),

			preferences: Joi.object({
				notifications: Joi.boolean().optional(),
				theme: Joi.string().valid('light', 'dark').optional()
			}).optional()
		});

		this._resetPasswordRequestSchema = Joi.object({
			email: Joi.string().email().required()
				.messages({
					'string.email': 'Please provide a valid email address',
					'any.required': 'Email is required'
				})
		});

		this._resetPasswordSchema = Joi.object({
			token: Joi.string().required()
				.messages({
					'any.required': 'Reset token is required'
				}),

			newPassword: Joi.string().min(8).required()
				.pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
				.messages({
					'string.min': 'New password must be at least 8 characters long',
					'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
					'any.required': 'New password is required'
				}),

			confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required()
				.messages({
					'any.only': 'New passwords do not match',
					'any.required': 'New password confirmation is required'
				})
		});
	}

	/**
	 * Function wrapper for register schema validation
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result
	 */
	registerSchema = (data) => {
		return this._registerSchema.validate(data, { abortEarly: false });
	}

	verifyOTPSchema = (data) => {
		return this._verifyOTPSchema.validate(data, { abortEarly: false });
	}

	resendOTPSchema = (data) => {
		return this._resendOTPSchema.validate(data, { abortEarly: false });
	}

	/**
	 * Function wrapper for login schema validation
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result
	 */
	loginSchema = (data) => {
		return this._loginSchema.validate(data, { abortEarly: false });
	}

	/**
	 * Function wrapper for update profile schema validation
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result
	 */
	updateProfileSchema = (data) => {
		return this._updateProfileSchema.validate(data, { abortEarly: false });
	}

	/**
	 * Function wrapper for change password schema validation
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result
	 */
	changePasswordSchema = (data) => {
		return this._changePasswordSchema.validate(data, { abortEarly: false });
	}

	/**
	 * Function wrapper for user status schema validation
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result
	 */
	userStatusSchema = (data) => {
		return this._userStatusSchema.validate(data, { abortEarly: false });
	}

	/**
	 * Function wrapper for admin create user schema validation
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result
	 */
	adminCreateUserSchema = (data) => {
		return this._adminCreateUserSchema.validate(data, { abortEarly: false });
	}

	/**
	 * Function wrapper for admin update user schema validation
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result
	 */
	adminUpdateUserSchema = (data) => {
		return this._adminUpdateUserSchema.validate(data, { abortEarly: false });
	}

	/**
	 * Function wrapper for reset password request schema validation
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result
	 */
	resetPasswordRequestSchema = (data) => {
		return this._resetPasswordRequestSchema.validate(data, { abortEarly: false });
	}

	/**
	 * Function wrapper for reset password schema validation
	 * @param {Object} data - Data to validate
	 * @returns {Object} Validation result
	 */
	resetPasswordSchema = (data) => {
		return this._resetPasswordSchema.validate(data, { abortEarly: false });
	}
}

module.exports = new UserValidator();