// src/utils/validators.js

/**
 * @description Common validation utility functions
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
const isValidEmail = (email) => {
	if (!email) return false;
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

/**
 * Validate phone number format (simple validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether phone is valid
 */
const isValidPhone = (phone) => {
	if (!phone) return false;
	// Simple validation - adjust based on your country's phone format
	const phoneRegex = /^[+]?[\d\s-]{7,15}$/;
	return phoneRegex.test(phone);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and message
 */
const validatePassword = (password) => {
	if (!password) {
		return { isValid: false, message: 'Password is required' };
	}

	if (password.length < 8) {
		return { isValid: false, message: 'Password must be at least 8 characters long' };
	}

	// Check for at least one uppercase, one lowercase, and one number
	const hasUppercase = /[A-Z]/.test(password);
	const hasLowercase = /[a-z]/.test(password);
	const hasNumber = /\d/.test(password);

	if (!hasUppercase || !hasLowercase || !hasNumber) {
		return {
			isValid: false,
			message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
		};
	}

	return { isValid: true, message: 'Password is valid' };
};

/**
 * Validate that a string is not empty
 * @param {string} value - Value to check
 * @returns {boolean} Whether value is not empty
 */
const isNotEmpty = (value) => {
	return value !== undefined && value !== null && value.toString().trim() !== '';
};

/**
 * Validate numeric value
 * @param {*} value - Value to validate
 * @returns {boolean} Whether value is numeric
 */
const isNumeric = (value) => {
	if (value === undefined || value === null) return false;
	return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Validate positive number
 * @param {*} value - Value to validate
 * @returns {boolean} Whether value is a positive number
 */
const isPositiveNumber = (value) => {
	return isNumeric(value) && parseFloat(value) > 0;
};

/**
 * Validate non-negative number (zero or positive)
 * @param {*} value - Value to validate
 * @returns {boolean} Whether value is non-negative
 */
const isNonNegativeNumber = (value) => {
	return isNumeric(value) && parseFloat(value) >= 0;
};

/**
 * Validate date string format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} Whether date string is valid
 */
const isValidDate = (dateStr) => {
	if (!dateStr) return false;
	const date = new Date(dateStr);
	return !isNaN(date.getTime());
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid
 */
const isValidUrl = (url) => {
	if (!url) return false;
	try {
		new URL(url);
		return true;
	} catch (error) {
		return false;
	}
};

/**
 * Validate object ID format (MongoDB-style)
 * @param {string} id - ID to validate
 * @returns {boolean} Whether ID has valid format
 */
const isValidObjectId = (id) => {
	if (!id) return false;
	return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate array
 * @param {*} value - Value to validate
 * @returns {boolean} Whether value is an array
 */
const isArray = (value) => {
	return Array.isArray(value);
};

/**
 * Validate array with minimum length
 * @param {*} value - Value to validate
 * @param {number} minLength - Minimum length
 * @returns {boolean} Whether value is an array with minimum length
 */
const isArrayWithMinLength = (value, minLength) => {
	return isArray(value) && value.length >= minLength;
};

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} Whether string length is within range
 */
const isStringLengthValid = (value, min, max) => {
	if (typeof value !== 'string') return false;
	const length = value.length;
	return length >= min && length <= max;
};

/**
 * Sanitize a string by trimming and removing dangerous characters
 * @param {string} value - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (value) => {
	if (!value || typeof value !== 'string') return '';
	// Remove HTML tags and trim
	return value.replace(/<[^>]*>/g, '').trim();
};

/**
 * Validate postal/ZIP code (basic validation)
 * @param {string} postalCode - Postal code to validate
 * @returns {boolean} Whether postal code is valid
 */
const isValidPostalCode = (postalCode) => {
	if (!postalCode) return false;
	// Basic validation - adjust based on your country's postal code format
	return /^[a-zA-Z0-9\s-]{3,10}$/.test(postalCode);
};

module.exports = {
	isValidEmail,
	isValidPhone,
	validatePassword,
	isNotEmpty,
	isNumeric,
	isPositiveNumber,
	isNonNegativeNumber,
	isValidDate,
	isValidUrl,
	isValidObjectId,
	isArray,
	isArrayWithMinLength,
	isStringLengthValid,
	sanitizeString,
	isValidPostalCode
};