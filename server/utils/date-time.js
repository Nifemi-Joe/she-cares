// src/utils/date-time.js

/**
 * @module DateTimeUtils
 * @description Utility functions for date and time operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
	const d = new Date(date);
	return d.toISOString().split('T')[0];
};

/**
 * Format date and time (YYYY-MM-DD HH:MM:SS)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time
 */
const formatDateTime = (date) => {
	const d = new Date(date);
	return `${formatDate(d)} ${formatTime(d)}`;
};

/**
 * Format time (HH:MM:SS)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time
 */
const formatTime = (date) => {
	const d = new Date(date);
	return d.toTimeString().split(' ')[0];
};

/**
 * Format date as human-readable (e.g., "May 15, 2023")
 * @param {Date|string} date - Date to format
 * @returns {string} Human-readable date
 */
const formatHumanDate = (date) => {
	const d = new Date(date);
	return d.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
};

/**
 * Get relative time (e.g., "2 days ago", "in 3 hours")
 * @param {Date|string} date - Date to compare with current time
 * @returns {string} Relative time
 */
const getRelativeTime = (date) => {
	const now = new Date();
	const d = new Date(date);
	const diffMs = d - now;
	const diffSec = Math.round(diffMs / 1000);
	const diffMin = Math.round(diffSec / 60);
	const diffHr = Math.round(diffMin / 60);
	const diffDays = Math.round(diffHr / 24);
	const diffMonths = Math.round(diffDays / 30);
	const diffYears = Math.round(diffDays / 365);

	if (Math.abs(diffSec) < 60) {
		return diffSec >= 0 ? 'in a few seconds' : 'a few seconds ago';
	} else if (Math.abs(diffMin) < 60) {
		return diffMin > 0 ? `in ${diffMin} minute(s)` : `${Math.abs(diffMin)} minute(s) ago`;
	} else if (Math.abs(diffHr) < 24) {
		return diffHr > 0 ? `in ${diffHr} hour(s)` : `${Math.abs(diffHr)} hour(s) ago`;
	} else if (Math.abs(diffDays) < 30) {
		return diffDays > 0 ? `in ${diffDays} day(s)` : `${Math.abs(diffDays)} day(s) ago`;
	} else if (Math.abs(diffMonths) < 12) {
		return diffMonths > 0 ? `in ${diffMonths} month(s)` : `${Math.abs(diffMonths)} month(s) ago`;
	} else {
		return diffYears > 0 ? `in ${diffYears} year(s)` : `${Math.abs(diffYears)} year(s) ago`;
	}
};

/**
 * Add days to a date
 * @param {Date|string} date - Base date
 * @param {number} days - Number of days to add
 * @returns {Date} New date
 */
const addDays = (date, days) => {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
};

/**
 * Calculate difference between dates in days
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Difference in days
 */
const getDaysDifference = (date1, date2) => {
	const d1 = new Date(date1);
	const d2 = new Date(date2);
	const diffTime = Math.abs(d2 - d1);
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} Whether date is today
 */
const isToday = (date) => {
	const d = new Date(date);
	const today = new Date();
	return d.getDate() === today.getDate() &&
		d.getMonth() === today.getMonth() &&
		d.getFullYear() === today.getFullYear();
};

/**
 * Get start of day
 * @param {Date|string} date - Date to get start of day for
 * @returns {Date} Start of day
 */
const getStartOfDay = (date) => {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
};

/**
 * Get end of day
 * @param {Date|string} date - Date to get end of day for
 * @returns {Date} End of day
 */
const getEndOfDay = (date) => {
	const d = new Date(date);
	d.setHours(23, 59, 59, 999);
	return d;
};

/**
 * Get start of month
 * @param {Date|string} date - Date to get start of month for
 * @returns {Date} Start of month
 */
const getStartOfMonth = (date) => {
	const d = new Date(date);
	d.setDate(1);
	d.setHours(0, 0, 0, 0);
	return d;
};

/**
 * Get end of month
 * @param {Date|string} date - Date to get end of month for
 * @returns {Date} End of month
 */
const getEndOfMonth = (date) => {
	const d = new Date(date);
	d.setMonth(d.getMonth() + 1);
	d.setDate(0);
	d.setHours(23, 59, 59, 999);
	return d;
};

/**
 * Get date range for last N days
 * @param {number} days - Number of days
 * @returns {Object} Object with startDate and endDate
 */
const getLastNDaysRange = (days) => {
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);
	return { startDate, endDate };
};

module.exports = {
	formatDate,
	formatDateTime,
	formatTime,
	formatHumanDate,
	getRelativeTime,
	addDays,
	getDaysDifference,
	isToday,
	getStartOfDay,
	getEndOfDay,
	getStartOfMonth,
	getEndOfMonth,
	getLastNDaysRange
};