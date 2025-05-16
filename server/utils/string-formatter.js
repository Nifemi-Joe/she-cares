// src/utils/string-formatter.js

/**
 * @module StringFormatter
 * @description Utility functions for string formatting operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

/**
 * Capitalize first letter of each word
 * @param {string} str - Input string
 * @returns {string} Formatted string
 */
const capitalizeWords = (str) => {
	if (!str) return '';
	return str.replace(/\b\w/g, match => match.toUpperCase());
};

/**
 * Capitalize first letter of a string
 * @param {string} str - Input string
 * @returns {string} Formatted string
 */
const capitalizeFirst = (str) => {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert string to camelCase
 * @param {string} str - Input string
 * @returns {string} Camel case string
 */
const toCamelCase = (str) => {
	if (!str) return '';
	return str
		.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
		.replace(/^(.)/, (s) => s.toLowerCase());
};

/**
 * Convert string to snake_case
 * @param {string} str - Input string
 * @returns {string} Snake case string
 */
const toSnakeCase = (str) => {
	if (!str) return '';
	return str
		.replace(/([a-z])([A-Z])/g, '$1_$2')
		.replace(/[\s-]+/g, '_')
		.toLowerCase();
};

/**
 * Convert string to kebab-case
 * @param {string} str - Input string
 * @returns {string} Kebab case string
 */
const toKebabCase = (str) => {
	if (!str) return '';
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[\s_]+/g, '-')
		.toLowerCase();
};

/**
 * Truncate string to specified length
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string} Truncated string
 */
const truncate = (str, maxLength, suffix = '...') => {
	if (!str) return '';
	if (str.length <= maxLength) return str;
	return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Strip HTML tags from string
 * @param {string} str - Input string with HTML
 * @returns {string} String without HTML tags
 */
const stripHtml = (str) => {
	if (!str) return '';
	return str.replace(/<[^>]*>/g, '');
};

/**
 * Escape HTML special characters
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
const escapeHtml = (str) => {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
};

/**
 * Slugify string (convert to URL-friendly format)
 * @param {string} str - Input string
 * @returns {string} Slugified string
 */
const slugify = (str) => {
	if (!str) return '';
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '') // Remove non-word chars
		.replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
		.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Format number as currency
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code (default: 'NGN')
 * @param {string} locale - Locale (default: 'en-NG')
 * @returns {string} Formatted currency
 */
const formatCurrency = (amount, currencyCode = 'NGN', locale = 'en-NG') => {
	if (amount === null || amount === undefined) return '';
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: currencyCode
	}).format(amount);
};

/**
 * Format number with thousands separators
 * @param {number} num - Number to format
 * @param {string} locale - Locale (default: 'en-NG')
 * @returns {string} Formatted number
 */
const formatNumber = (num, locale = 'en-NG') => {
	if (num === null || num === undefined) return '';
	return new Intl.NumberFormat(locale).format(num);
};

/**
 * Convert newline characters to HTML line breaks
 * @param {string} str - Input string
 * @returns {string} String with HTML line breaks
 */
const nl2br = (str) => {
	if (!str) return '';
	return str.replace(/\n/g, '<br>');
};

/**
 * Generate random string
 * @param {number} length - Length of string (default: 10)
 * @param {string} chars - Characters to use (default: alphanumeric)
 * @returns {string} Random string
 */
const randomString = (length = 10, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
	let result = '';
	const charsLength = chars.length;
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * charsLength));
	}
	return result;
};

/**
 * Mask sensitive data (e.g. for PII)
 * @param {string} str - String to mask
 * @param {number} visibleChars - Number of visible characters at start and end
 * @param {string} maskChar - Character to use for masking (default: '*')
 * @returns {string} Masked string
 */
const maskString = (str, visibleChars = 2, maskChar = '*') => {
	if (!str || str.length <= visibleChars * 2) return str;

	const start = str.substring(0, visibleChars);
	const end = str.substring(str.length - visibleChars);
	const mask = maskChar.repeat(Math.max(1, str.length - (visibleChars * 2)));

	return start + mask + end;
};

module.exports = {
	capitalizeWords,
	capitalizeFirst,
	toCamelCase,
	toSnakeCase,
	toKebabCase,
	truncate,
	stripHtml,
	escapeHtml,
	slugify,
	formatCurrency,
	formatNumber,
	nl2br,
	randomString,
	maskString
};