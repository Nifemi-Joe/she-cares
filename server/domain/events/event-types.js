// src/domain/events/event-types.js

/**
 * Event types for the domain event system
 * @description Centralized list of all event types across the application
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

const EventTypes = {
	// Product events
	PRODUCT_CREATED: 'product.created',
	PRODUCT_UPDATED: 'product.updated',
	PRODUCT_DELETED: 'product.deleted',
	PRODUCT_STOCK_LOW: 'product.stock.low',
	PRODUCT_OUT_OF_STOCK: 'product.stock.out',
	PRODUCT_BACK_IN_STOCK: 'product.stock.back',

	// Category events
	CATEGORY_CREATED: 'category.created',
	CATEGORY_UPDATED: 'category.updated',
	CATEGORY_DELETED: 'category.deleted',

	// Order events
	ORDER_CREATED: 'order.created',
	ORDER_UPDATED: 'order.updated',
	ORDER_CANCELLED: 'order.cancelled',
	ORDER_COMPLETED: 'order.completed',
	ORDER_STATUS_CHANGED: 'order.status.changed',

	// Invoice events
	INVOICE_CREATED: 'invoice.created',
	INVOICE_SENT: 'invoice.sent',
	INVOICE_PAID: 'invoice.paid',
	INVOICE_OVERDUE: 'invoice.overdue',
	INVOICE_CANCELLED: 'invoice.cancelled',

	// Client events
	CLIENT_CREATED: 'client.created',
	CLIENT_UPDATED: 'client.updated',
	CLIENT_DELETED: 'client.deleted',

	// Delivery events
	DELIVERY_CREATED: 'delivery.created',
	DELIVERY_ASSIGNED: 'delivery.assigned',
	DELIVERY_IN_TRANSIT: 'delivery.in_transit',
	DELIVERY_COMPLETED: 'delivery.completed',
	DELIVERY_FAILED: 'delivery.failed',
	DELIVERY_CANCELLED: 'delivery.cancelled',

	// User events
	USER_CREATED: 'user.created',
	USER_UPDATED: 'user.updated',
	USER_DELETED: 'user.deleted',
	USER_LOGGED_IN: 'user.logged_in',
	USER_LOGGED_OUT: 'user.logged_out',
	USER_PASSWORD_RESET: 'user.password.reset',

	// System events
	SYSTEM_ERROR: 'system.error',
	BACKUP_COMPLETED: 'backup.completed',
	BACKUP_FAILED: 'backup.failed'
};

module.exports = EventTypes;