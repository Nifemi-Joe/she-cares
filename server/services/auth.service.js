// src/services/auth.service.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../data/repositories/user.repository');
const config = require('../config/security.config');
const { AuthenticationError, NotFoundError } = require('../utils/error-handler');

/**
 * @class AuthService
 * @description Service handling authentication and user management
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class AuthService {
	/**
	 * Register a new user
	 * @param {Object} userData - User data for registration
	 * @returns {Object} Registered user data
	 */
	async register(userData) {
		// Check if user already exists
		const existingUser = await userRepository.findByEmail(userData.email);
		if (existingUser) {
			throw new AuthenticationError('User with this email already exists');
		}

		// Hash password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(userData.password, salt);

		// Create user
		const user = await userRepository.create({
			...userData,
			password: hashedPassword,
			role: userData.role || 'staff',
			isActive: true
		});

		return this._sanitizeUser(user);
	}

	/**
	 * Log in a user
	 * @param {string} email - User email
	 * @param {string} password - User password
	 * @returns {Object} Authentication data with JWT token
	 */
	async login(email, password) {
		// Find user
		const user = await userRepository.findByEmail(email);
		if (!user) {
			throw new AuthenticationError('Invalid credentials');
		}

		// Check if user is active
		if (!user.isActive) {
			throw new AuthenticationError('Account is deactivated');
		}

		// Verify password
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			throw new AuthenticationError('Invalid credentials');
		}

		// Update last login
		user.updateLastLogin();
		await userRepository.update(user.id, user);

		// Generate JWT token
		const token = this._generateToken(user);
		console.log(user)
		return {
			token,
			user: this._sanitizeUser(user)
		};
	}

	/**
	 * Get user profile by ID
	 * @param {string} userId - User ID
	 * @returns {Object} User profile
	 */
	async getProfile(userId) {
		const user = await userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}
		console.log(user)
		return this._sanitizeUser(user);
	}

	/**
	 * Update user profile
	 * @param {string} userId - User ID
	 * @param {Object} profileData - Updated profile data
	 * @returns {Object} Updated user profile
	 */
	async updateProfile(userId, profileData) {
		const user = await userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		user.updateProfile(profileData);
		await userRepository.update(userId, user);

		return this._sanitizeUser(user);
	}

	/**
	 * Change user password
	 * @param {string} userId - User ID
	 * @param {string} currentPassword - Current password
	 * @param {string} newPassword - New password
	 * @returns {boolean} Whether password was changed successfully
	 */
	async changePassword(userId, currentPassword, newPassword) {
		const user = await userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Verify current password
		const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
		if (!isPasswordValid) {
			throw new AuthenticationError('Current password is incorrect');
		}

		// Hash new password
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(newPassword, salt);

		// Update password
		user.password = hashedPassword;
		user.updatedAt = new Date();
		await userRepository.update(userId, user);

		return true;
	}

	/**
	 * Get all users (admin only)
	 * @returns {Array} List of users
	 */
	async getAllUsers() {
		const users = await userRepository.findAll();
		return users.map(user => this._sanitizeUser(user));
	}

	/**
	 * Activate or deactivate a user
	 * @param {string} userId - User ID
	 * @param {boolean} isActive - Activation status
	 * @returns {Object} Updated user
	 */
	async setUserStatus(userId, isActive) {
		const user = await userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		if (isActive) {
			user.activate();
		} else {
			user.deactivate();
		}

		await userRepository.update(userId, user);
		return this._sanitizeUser(user);
	}

	/**
	 * Generate JWT token
	 * @param {Object} user - User object
	 * @returns {string} JWT token
	 * @private
	 */
	_generateToken(user) {
		return jwt.sign(
			{
				id: user.id,
				email: user.email,
				role: user.role
			},
			config.jwtSecret,
			{ expiresIn: config.jwtExpiresIn }
		);
	}

	/**
	 * Remove sensitive data from user object
	 * @param {Object} user - User object
	 * @returns {Object} Sanitized user object
	 * @private
	 */
	_sanitizeUser(user) {
		const { password, ...sanitizedUser } = user.toJSON ? user.toJSON() : user;
		return sanitizedUser;
	}
}

module.exports = new AuthService();