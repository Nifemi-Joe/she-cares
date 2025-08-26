// src/services/auth.service.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../data/repositories/user.repository');
const config = require('../config/security.config');
const emailService = require('./email.service');
const { AuthenticationError, NotFoundError, ValidationError } = require('../utils/error-handler');

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

		// Generate OTP
		const otp = this._generateOTP();
		const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

		// Create user with OTP (not verified yet)
		const user = await userRepository.create({
			...userData,
			password: hashedPassword,
			role: userData.role || 'client',
			isActive: false, // Will be activated after OTP verification
			isVerified: false,
			otp: otp,
			otpExpiry: otpExpiry
		});

		// Send OTP email
		await emailService.sendOTPVerification(user, otp);

		return {
			user: this._sanitizeUser(user)
		};
	}

	/**
	 * Verify OTP
	 * @param {string} email - User email
	 * @param {string} otp - OTP code
	 * @returns {Object} Authentication data with JWT token
	 */
	async verifyOTP(email, otp) {
		// Find user
		const user = await userRepository.findByEmail(email);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Check if user is already verified
		if (user.isActive) {
			throw new ValidationError('User is already verified');
		}

		// Check if OTP matches
		if (user.otp !== otp) {
			throw new ValidationError('Invalid OTP');
		}

		// Check if OTP is expired
		if (new Date() > user.otpExpiry) {
			throw new ValidationError('OTP has expired. Please request a new one.');
		}

		// Update user as verified and active
		user.isVerified = true;
		user.isActive = true;
		user.otp = null;
		user.otpExpiry = null;
		user.updatedAt = new Date();

		await userRepository.update(user.id, user);

		// Generate JWT token
		const token = this._generateToken(user);

		// Send welcome email
		await emailService.sendWelcomeEmail(user);

		return {
			token,
			user: this._sanitizeUser(user)
		};
	}

	/**
	 * Resend OTP
	 * @param {string} email - User email
	 * @returns {boolean} Success status
	 */
	async resendOTP(email) {
		// Find user
		const user = await userRepository.findByEmail(email);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Check if user is already verified
		if (user.isActive) {
			throw new ValidationError('User is already verified');
		}

		// Generate new OTP
		const otp = this._generateOTP();
		const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

		// Update user with new OTP
		user.otp = otp;
		user.otpExpiry = otpExpiry;
		user.updatedAt = new Date();

		await userRepository.update(user.id, user);

		// Send OTP email
		await emailService.sendOTPVerification(user, otp);

		return true;
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

		// Check if user is verified
		if (!user.isActive) {
			throw new AuthenticationError('Please verify your account first. Check your email for OTP.');
		}
		//
		// // Check if user is active
		// if (!user.isActive) {
		// 	throw new AuthenticationError('Account is deactivated');
		// }

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
	 * Generate OTP
	 * @returns {string} 6-digit OTP
	 * @private
	 */
	_generateOTP() {
		return crypto.randomInt(100000, 999999).toString();
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
			config.jwt.secret,
			{ expiresIn: config.jwt.expiresIn }
		);
	}

	/**
	 * Remove sensitive data from user object
	 * @param {Object} user - User object
	 * @returns {Object} Sanitized user object
	 * @private
	 */
	_sanitizeUser(user) {
		const { password, otp, otpExpiry, ...sanitizedUser } = user.toJSON ? user.toJSON() : user;
		return sanitizedUser;
	}
}

module.exports = new AuthService();