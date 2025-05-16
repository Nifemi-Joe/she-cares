// src/infrastructure/security/encryption.js

const crypto = require('crypto');
const config = require('../../config/security.config');
const { logger } = require('../logging/logger');

/**
 * @class Encryption
 * @description Handles data encryption and decryption
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class Encryption {
	constructor() {
		this.algorithm = config.encryption.algorithm || 'aes-256-cbc';

		// Use provided key or generate one if not available
		// In production, this should be set in environment variables
		this._validateEncryptionKey();
	}

	/**
	 * Validate encryption key
	 * @private
	 */
	_validateEncryptionKey() {
		if (!config.encryption.key) {
			logger.warn('Encryption key not found in configuration. Using fallback for development.');
		}

		// Ensure key is proper length for AES-256
		const keyBuffer = config.encryption.key
			? Buffer.from(config.encryption.key, 'hex')
			: crypto.randomBytes(32); // 32 bytes = 256 bits

		if (keyBuffer.length !== 32) {
			logger.warn(`Encryption key length (${keyBuffer.length}) is not ideal for ${this.algorithm}`);
		}

		this.key = keyBuffer;
	}

	/**
	 * Encrypt data
	 * @param {string|Object} data - Data to encrypt
	 * @returns {Object} Encrypted data with initialization vector
	 */
	encrypt(data) {
		try {
			// Convert object to string if needed
			const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);

			// Generate initialization vector
			const iv = crypto.randomBytes(16);

			// Create cipher
			const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

			// Encrypt data
			let encrypted = cipher.update(dataString, 'utf8', 'hex');
			encrypted += cipher.final('hex');

			return {
				iv: iv.toString('hex'),
				encryptedData: encrypted
			};
		} catch (error) {
			logger.error(`Encryption failed: ${error.message}`);
			throw new Error('Failed to encrypt data');
		}
	}

	/**
	 * Decrypt data
	 * @param {Object} encryptedData - Object with encrypted data and IV
	 * @param {string} encryptedData.iv - Initialization vector in hex
	 * @param {string} encryptedData.encryptedData - Encrypted data in hex
	 * @param {boolean} parseJson - Whether to parse result as JSON
	 * @returns {string|Object} Decrypted data
	 */
	decrypt(encryptedData, parseJson = false) {
		try {
			// Convert IV from hex to buffer
			const iv = Buffer.from(encryptedData.iv, 'hex');

			// Create decipher
			const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

			// Decrypt data
			let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
			decrypted += decipher.final('utf8');

			// Parse as JSON if requested
			return parseJson ? JSON.parse(decrypted) : decrypted;
		} catch (error) {
			logger.error(`Decryption failed: ${error.message}`);
			throw new Error('Failed to decrypt data');
		}
	}

	/**
	 * Generate secure random token
	 * @param {number} byteLength - Length of token in bytes
	 * @returns {string} Hex token
	 */
	generateToken(byteLength = 32) {
		try {
			return crypto.randomBytes(byteLength).toString('hex');
		} catch (error) {
			logger.error(`Token generation failed: ${error.message}`);
			throw new Error('Failed to generate secure token');
		}
	}

	/**
	 * Hash data using SHA-256
	 * @param {string} data - Data to hash
	 * @returns {string} Hashed data
	 */
	hash(data) {
		try {
			return crypto.createHash('sha256').update(data).digest('hex');
		} catch (error) {
			logger.error(`Hashing failed: ${error.message}`);
			throw new Error('Failed to hash data');
		}
	}

	/**
	 * Create HMAC for data
	 * @param {string} data - Data to sign
	 * @param {string} secret - Secret key (defaults to encryption key)
	 * @returns {string} HMAC signature
	 */
	createHmac(data, secret) {
		try {
			const hmacKey = secret || this.key.toString('hex');
			return crypto.createHmac('sha256', hmacKey).update(data).digest('hex');
		} catch (error) {
			logger.error(`HMAC creation failed: ${error.message}`);
			throw new Error('Failed to create HMAC');
		}
	}

	/**
	 * Verify HMAC signature
	 * @param {string} data - Original data
	 * @param {string} signature - HMAC signature to verify
	 * @param {string} secret - Secret key (defaults to encryption key)
	 * @returns {boolean} Whether signature is valid
	 */
	verifyHmac(data, signature, secret) {
		try {
			const expectedSignature = this.createHmac(data, secret);
			return crypto.timingSafeEqual(
				Buffer.from(expectedSignature, 'hex'),
				Buffer.from(signature, 'hex')
			);
		} catch (error) {
			logger.error(`HMAC verification failed: ${error.message}`);
			return false;
		}
	}
}

module.exports = new Encryption();