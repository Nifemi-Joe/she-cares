// src/infrastructure/caching/cache-manager.js

const NodeCache = require('node-cache');
const logger = require('../logging/logger');

/**
 * Cache Manager
 * @description Provides in-memory caching functionality
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class CacheManager {
	/**
	 * Initialize cache manager
	 * @param {Object} options - Cache options
	 * @param {number} options.stdTTL - Standard TTL in seconds (default: 600)
	 * @param {boolean} options.checkperiod - Check period for expired keys (default: 120)
	 * @param {boolean} options.useClones - Whether to use clones for get/set operations (default: false)
	 */
	constructor(options = {}) {
		this.cache = new NodeCache({
			stdTTL: options.stdTTL || 600, // 10 minutes default TTL
			checkperiod: options.checkperiod || 120, // Check for expired keys every 2 minutes
			useClones: options.useClones !== undefined ? options.useClones : false, // Don't clone objects (better performance)
			...options
		});

		// Setup event handlers
		this._setupEventHandlers();

		logger.info('Cache manager initialized', {
			stdTTL: this.cache.options.stdTTL,
			checkperiod: this.cache.options.checkperiod
		});
	}

	/**
	 * Get value from cache
	 * @param {string} key - Cache key
	 * @returns {*} Cached value or undefined if not found
	 */
	get(key) {
		return this.cache.get(key);
	}

	/**
	 * Set value in cache
	 * @param {string} key - Cache key
	 * @param {*} value - Value to cache
	 * @param {number} ttl - TTL in seconds (optional, overrides default)
	 * @returns {boolean} Whether value was set successfully
	 */
	set(key, value, ttl = undefined) {
		return this.cache.set(key, value, ttl);
	}

	/**
	 * Check if key exists in cache
	 * @param {string} key - Cache key
	 * @returns {boolean} Whether key exists
	 */
	has(key) {
		return this.cache.has(key);
	}

	/**
	 * Delete key from cache
	 * @param {string} key - Cache key
	 * @returns {number} Number of deleted entries (0 or 1)
	 */
	delete(key) {
		return this.cache.del(key);
	}

	/**
	 * Get multiple values from cache
	 * @param {Array<string>} keys - Array of cache keys
	 * @returns {Object} Object with key-value pairs of found items
	 */
	mget(keys) {
		return this.cache.mget(keys);
	}

	/**
	 * Set multiple values in cache
	 * @param {Object} data - Object with key-value pairs to cache
	 * @param {number} ttl - TTL in seconds (optional, overrides default)
	 * @returns {boolean} Whether values were set successfully
	 */
	mset(data, ttl = undefined) {
		const dataWithTTL = Object.entries(data).map(([key, value]) => {
			return { key, val: value, ttl };
		});

		return this.cache.mset(dataWithTTL);
	}

	/**
	 * Delete multiple keys from cache
	 * @param {Array<string>} keys - Array of cache keys to delete
	 * @returns {number} Number of deleted entries
	 */
	mdelete(keys) {
		return this.cache.del(keys);
	}

	/**
	 * Clear entire cache
	 * @returns {void}
	 */
	clear() {
		this.cache.flushAll();
		logger.info('Cache cleared');
	}

	/**
	 * Get cache statistics
	 * @returns {Object} Cache statistics
	 */
	getStats() {
		return this.cache.getStats();
	}

	/**
	 * Get all cache keys
	 * @returns {Array<string>} Array of cache keys
	 */
	getKeys() {
		return this.cache.keys();
	}

	/**
	 * Get ttl for a key
	 * @param {string} key - Cache key
	 * @returns {number} Remaining TTL in seconds or -1 if expired/not found
	 */
	getTtl(key) {
		return this.cache.getTtl(key);
	}

	/**
	 * Set new ttl for a key
	 * @param {string} key - Cache key
	 * @param {number} ttl - New TTL in seconds
	 * @returns {boolean} Whether TTL was set successfully
	 */
	setTtl(key, ttl) {
		return this.cache.ttl(key, ttl);
	}

	/**
	 * Get or set cache value with factory function
	 * @param {string} key - Cache key
	 * @param {Function} factory - Function to generate value if not in cache
	 * @param {number} ttl - TTL in seconds (optional)
	 * @returns {Promise<*>} Cached or generated value
	 */
	async getOrSet(key, factory, ttl = undefined) {
		// Check if value exists in cache
		const cachedValue = this.get(key);
		if (cachedValue !== undefined) {
			return cachedValue;
		}

		try {
			// Generate value using factory
			const value = await factory();

			// Store in cache and return
			this.set(key, value, ttl);
			return value;
		} catch (error) {
			logger.error(`Error in cache factory for key ${key}:`, error);
			throw error;
		}
	}

	/**
	 * Setup cache event handlers
	 * @private
	 */
	_setupEventHandlers() {
		// Log expired items
		this.cache.on('expired', (key, value) => {
			logger.debug('Cache item expired', { key });
		});

		// Log cache errors
		this.cache.on('error', (error) => {
			logger.error('Cache error:', error);
		});
	}
}

// Create and export a singleton instance
const cacheManager = new CacheManager();
module.exports = cacheManager;