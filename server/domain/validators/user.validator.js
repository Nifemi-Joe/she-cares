// src/domain/validators/user.validator.js

const Joi = require('joi');

/**
 * @class UserValidator
 * @description Validation schemas for user-related operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class UserValidator {
	/**
	 * Validation schema for user registration
	 */
	registerSchema = Joi.object({
		fullName: Joi.string().min(3).max(100).required()
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

		role: Joi.string().valid('admin', 'staff').default('staff')
			.messages({
				'any.only': 'Role must be either "admin" or "staff"'
			}),

		phoneNumber: Joi.string().allow('').optional(),

		preferences: Joi.object({
			notifications: Joi.boolean().default(true),
			theme: Joi.string().valid('light', 'dark').default('light')
		}).optional()
	});

	/**
	 * Validation schema for user login
	 */
	loginSchema = Joi.object({
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

	/**
	 * Validation schema for updating user profile
	 */
	updateProfileSchema = Joi.object({
		fullName: Joi.string().min(3).max(100).optional()
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

	/**
	 * Validation schema for changing password
	 */
	changePasswordSchema = Joi.object({
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

	/**
	 * Validation schema for changing user status (activate/deactivate)
	 */
	userStatusSchema = Joi.object({
		isActive: Joi.boolean().required()
			.messages({
				'any.required': 'Active status is required'
			})
	});

	/**
	 * Validation schema for admin user creation
	 */
	adminCreateUserSchema = Joi.object({
		fullName: Joi.string().min(3).max(100).required()
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

		role: Joi.string().valid('admin', 'staff').required()
			.messages({
				'any.only': 'Role must be either "admin" or "staff"',
				'any.required': 'Role is required'
			}),

		phoneNumber: Joi.string().allow('').optional(),

		isActive: Joi.boolean().default(true),

		preferences: Joi.object({
			notifications: Joi.boolean().default(true),
			theme: Joi.string().valid('light', 'dark').default('light')
		}).optional()
	});

	/**
	 * Validation schema for admin user update
	 */
	adminUpdateUserSchema = Joi.object({
		fullName: Joi.string().min(3).max(100).optional()
			.messages({
				'string.min': 'Full name must be at least 3 characters long',
				'string.max': 'Full name cannot exceed 100 characters'
			}),

		role: Joi.string().valid('admin', 'staff').optional()
			.messages({
				'any.only': 'Role must be either "admin" or "staff"'
			}),

		phoneNumber: Joi.string().allow('').optional(),

		isActive: Joi.boolean().optional(),

		preferences: Joi.object({
			notifications: Joi.boolean().optional(),
			theme: Joi.string().valid('light', 'dark').optional()
		}).optional()
	});

	/**
	 * Validation schema for reset password request
	 */
	resetPasswordRequestSchema = Joi.object({
		email: Joi.string().email().required()
			.messages({
				'string.email': 'Please provide a valid email address',
				'any.required': 'Email is required'
			})
	});

	/**
	 * Validation schema for password reset
	 */
	resetPasswordSchema = Joi.object({
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

module.exports = new UserValidator();