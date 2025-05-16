// src/domain/events/event-dispatcher.js

/**
 * @class EventDispatcher
 * @description Central event dispatcher for the domain events system
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class EventDispatcher {
	constructor() {
		this.handlers = {};
		this.onceHandlers = {};
	}

	/**
	 * Register an event handler
	 * @param {string} eventType - Event type to listen for
	 * @param {Function} handler - Handler function
	 */
	on(eventType, handler) {
		if (!this.handlers[eventType]) {
			this.handlers[eventType] = [];
		}

		this.handlers[eventType].push(handler);
		return this; // Allow chaining
	}

	/**
	 * Register a one-time event handler
	 * @param {string} eventType - Event type to listen for
	 * @param {Function} handler - Handler function to be executed once
	 */
	once(eventType, handler) {
		if (!this.onceHandlers[eventType]) {
			this.onceHandlers[eventType] = [];
		}

		this.onceHandlers[eventType].push(handler);
		return this; // Allow chaining
	}

	/**
	 * Remove an event handler
	 * @param {string} eventType - Event type to remove handler from
	 * @param {Function} handler - Handler function to remove
	 */
	off(eventType, handler) {
		if (this.handlers[eventType]) {
			this.handlers[eventType] = this.handlers[eventType].filter(h => h !== handler);

			// Clean up empty arrays
			if (this.handlers[eventType].length === 0) {
				delete this.handlers[eventType];
			}
		}

		if (this.onceHandlers[eventType]) {
			this.onceHandlers[eventType] = this.onceHandlers[eventType].filter(h => h !== handler);

			// Clean up empty arrays
			if (this.onceHandlers[eventType].length === 0) {
				delete this.onceHandlers[eventType];
			}
		}

		return this; // Allow chaining
	}

	/**
	 * Dispatch an event to all registered handlers
	 * @param {string} eventType - Type of event to dispatch
	 * @param {Object} payload - Event data
	 */
	async dispatch(eventType, payload = {}) {
		const event = {
			type: eventType,
			timestamp: new Date(),
			payload
		};

		try {
			// Process regular handlers
			if (this.handlers[eventType]) {
				const promises = this.handlers[eventType].map(handler => handler(event));
				await Promise.all(promises);
			}

			// Process one-time handlers
			if (this.onceHandlers[eventType]) {
				const promises = this.onceHandlers[eventType].map(handler => handler(event));
				await Promise.all(promises);
				delete this.onceHandlers[eventType];
			}

			// Process wildcard handlers (if any)
			if (this.handlers['*']) {
				const promises = this.handlers['*'].map(handler => handler(event));
				await Promise.all(promises);
			}

			return true;
		} catch (error) {
			console.error(`Error dispatching event ${eventType}:`, error);
			// Re-throw the error to allow caller to handle it
			throw error;
		}
	}

	/**
	 * Get all registered handlers for an event type
	 * @param {string} eventType - Event type to get handlers for
	 * @returns {Array} Array of handler functions
	 */
	getHandlers(eventType) {
		return [
			...(this.handlers[eventType] || []),
			...(this.onceHandlers[eventType] || [])
		];
	}

	/**
	 * Check if an event type has any handlers
	 * @param {string} eventType - Event type to check
	 * @returns {boolean} Whether the event has handlers
	 */
	hasHandlers(eventType) {
		return (
			(this.handlers[eventType] && this.handlers[eventType].length > 0) ||
			(this.onceHandlers[eventType] && this.onceHandlers[eventType].length > 0)
		);
	}

	/**
	 * Remove all handlers for an event type
	 * @param {string} eventType - Event type to clear handlers for
	 */
	clearHandlers(eventType) {
		if (eventType) {
			delete this.handlers[eventType];
			delete this.onceHandlers[eventType];
		} else {
			this.handlers = {};
			this.onceHandlers = {};
		}

		return this; // Allow chaining
	}
}

// Create and export a singleton instance
const dispatcher = new EventDispatcher();

module.exports = dispatcher;