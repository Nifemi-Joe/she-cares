// src/api/controllers/auth.controller.js

const authService = require('../../services/auth.service');
const { ValidationError } = require('../../utils/error-handler');

/**
 * @class AuthController
 * @description Controller handling authentication requests
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class AuthController {
	/**
	 * Register a new user
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async register(req, res, next) {
		try {
			const userData = req.body;
			const user = await authService.register(userData);

			res.status(201).json({
				responseCode: 201,
				responseData: user,
				responseMessage: 'User registered successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Login a user
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async login(req, res, next) {
		try {
			const { email, password } = req.body;

			if (!email || !password) {
				throw new ValidationError('Email and password are required');
			}

			const authData = await authService.login(email, password);

			res.status(200).json({
				responseCode: 200,
				responseData: authData,
				responseMessage: 'Login successful'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get current user profile
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getProfile(req, res, next) {
		try {
			console.log(req.user)
			const userId = req.user.id;
			const user = await authService.getProfile(userId);

			res.status(200).json({
				responseCode: 200,
				responseData: user,
				responseMessage: 'Profile retrieved successfully.'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Update user profile
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updateProfile(req, res, next) {
		try {
			const userId = req.user.id;
			const profileData = req.body;
			const updatedUser = await authService.updateProfile(userId, profileData);

			res.status(200).json({
				responseCode: 200,
				responseData: updatedUser,
				responseMessage: 'Profile updated successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Change user password
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async changePassword(req, res, next) {
		try {
			const userId = req.user.id;
			const { currentPassword, newPassword } = req.body;

			if (!currentPassword || !newPassword) {
				throw new ValidationError('Current password and new password are required');
			}

			await authService.changePassword(userId, currentPassword, newPassword);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Password changed successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get all users (admin only)
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getAllUsers(req, res, next) {
		try {
			const users = await authService.getAllUsers();

			res.status(200).json({
				responseCode: 200,
				responseData: users,
				responseMessage: 'All Users retrieved successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Set user active status (admin only)
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async setUserStatus(req, res, next) {
		try {
			const { userId } = req.params;
			const { isActive } = req.body;

			if (isActive === undefined) {
				throw new ValidationError('isActive status is required');
			}

			const user = await authService.setUserStatus(userId, isActive);

			res.status(200).json({
				responseCode: 200,
				responseData: user,
				responseMessage: `User ${isActive ? 'activated' : 'deactivated'} successfully`
			});
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new AuthController();