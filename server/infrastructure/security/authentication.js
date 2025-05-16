// src/infrastructure/security/authentication.js

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../../config/security.config');
const { AuthenticationError } = require('../../utils/error-handler');
const { logger } = require('../logging/logger');

/**
 * @class Authentication
 * @description Handles authentication operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class Authentication {
	/**
	 * Generate JWT token
	 * @param {Object} payload - Token payload
	 * @param {Object} options - Token options
	 * @returns {string} JWT token
	 */
	generateToken(payload, options = {}) {
		try {
			const tokenOptions = {
				expiresIn: options.expiresIn || config.jwtExpiresIn
			};

			return jwt.sign(payload, config.jwtSecret, tokenOptions);
		} catch (error) {
			logger.error(`Error generating token: ${error.message}`);
			throw new Error('Failed to generate authentication token');
		}
	}

	/**
	 * Verify JWT token
	 * @param {string} token - JWT token
	 * @returns {Object} Decoded token payload
	 */
	verifyToken(token) {
		try {
			return jwt.verify(token, config.jwtSecret);
		} catch (error) {
			logger.error(`Token verification failed: ${error.message}`);
			if (error.name === 'TokenExpiredError') {
				throw new AuthenticationError('Token has expired');
			}
			throw new AuthenticationError('Invalid token');
		}
	}

	/**
	 * Hash password
	 * @param {string} password - Plain text password
	 * @returns {Promise<string>} Hashed password
	 */
	async hashPassword(password) {
		try {
			const salt = await bcrypt.genSalt(config.bcryptSaltRounds || 10);
			return await bcrypt.hash(password, salt);
		} catch (error) {
			logger.error(`Password hashing failed: ${error.message}`);
			throw new Error('Failed to hash password');
		}
	}

	/**
	 * Compare password with hash
	 * @param {string} password - Plain text password
	 * @param {string} hashedPassword - Hashed password
	 * @returns {Promise<boolean>} Whether passwords match
	 */
	async comparePassword(password, hashedPassword) {
		try {
			return await bcrypt.compare(password, hashedPassword);
		} catch (error) {
			logger.error(`Password comparison failed: ${error.message}`);
			throw new Error('Failed to verify password');
		}
	}

	/**
	 * Extract token from request
	 * @param {Object} req - Express request object
	 * @returns {string|null} JWT token or null if not found
	 */
	extractTokenFromRequest(req) {
		try {
			if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
				// Extract from Bearer token in Authorization header
				return req.headers.authorization.substring(7);
			} else if (req.cookies && req.cookies.token) {
				// Extract from cookies
				return req.cookies.token;
			} else if (req.query && req.query.token) {
				// Extract from query parameter (not recommended for production)
				return req.query.token;
			}
			return null;
		} catch (error) {
			logger.error(`Error extracting token from request: ${error.message}`);
			return null;
		}
	}

	/**
	 * Generate refresh token
	 * @param {string} userId - User ID
	 * @returns {Object} Refresh token and expiry
	 */
	generateRefreshToken(userId) {
		try {
			const token = crypto.randomBytes(40).toString('hex');
			const expiry = new Date();
			expiry.setDate(expiry.getDate() + (config.refreshTokenExpiryDays || 30));

			return {
				token,
				userId,
				expiresAt: expiry
			};
		} catch (error) {
			logger.error(`Error generating refresh token: ${error.message}`);
			throw new Error('Failed to generate refresh token');
		}
	}

	/**
	 * Generate password reset token
	 * @param {string} email - User email
	 * @returns {Object} Reset token and expiry
	 */
	generatePasswordResetToken(email) {
		try {
			const token = crypto.randomBytes(20).toString('hex');
			const expiry = new Date();
			expiry.setHours(expiry.getHours() + (config.resetTokenExpiryHours || 1));

			return {
				token,
				email,
				expiresAt: expiry
			};
		} catch (error) {
			logger.error(`Error generating password reset token: ${error.message}`);
			throw new Error('Failed to generate password reset token');
		}
	}
}

module.exports = new Authentication();