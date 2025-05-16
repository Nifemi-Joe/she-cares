// src/domain/events/order-events.js

const EventTypes = require('./event-types');
const dispatcher = require('./event-dispatcher');

/**
 * Order event handlers and dispatchers
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

/**
 * Dispatch an order created event
 * @param {Order} order - Newly created order
 */
function dispatchOrderCreated(order) {
	return dispatcher.dispatch(EventTypes.ORDER_CREATED, {
		orderId: order.id,
		clientId: order.clientId,
		total: order.total,
		items: order.items.length,
		deliveryMethod: order.deliveryMethod,
		timestamp: new Date()
	});
}

/**
 * Dispatch an order status change event
 * @param {Order} order - Updated order
 * @param {string} previousStatus - Previous order status
 */
function dispatchOrderStatusChanged(order, previousStatus) {
	return dispatcher.dispatch(EventTypes.ORDER_STATUS_CHANGED, {
		orderId: order.id,
		clientId: order.clientId,
		previousStatus,
		newStatus: order.status,
		timestamp: new Date()
	});
}

/**
 * Dispatch an order cancelled event
 * @param {Order} order - Cancelled order
 * @param {string} reason - Cancellation reason
 */
function dispatchOrderCancelled(order, reason) {
	return dispatcher.dispatch(EventTypes.ORDER_CANCELLED, {
		orderId: order.id,
		clientId: order.clientId,
		reason,
		timestamp: new Date()
	});
}

/**
 * Dispatch an order completed event
 * @param {Order} order - Completed order
 */
function dispatchOrderCompleted(order) {
	return dispatcher.dispatch(EventTypes.ORDER_COMPLETED, {
		orderId: order.id,
		clientId: order.clientId,
		total: order.total,
		timestamp: new Date()
	});
}

/**
 * Register handlers for order events
 * @param {Function} onOrderCreated - Handler for order created events
 * @param {Function} onOrderStatusChanged - Handler for order status changed events
 * @param {Function} onOrderCancelled - Handler for order cancelled events
 * @param {Function} onOrderCompleted - Handler for order completed events
 */
function registerOrderEventHandlers({
	                                    onOrderCreated,
	                                    onOrderStatusChanged,
	                                    onOrderCancelled,
	                                    onOrderCompleted
                                    }) {
	if (onOrderCreated) {
		dispatcher.on(EventTypes.ORDER_CREATED, onOrderCreated);
	}

	if (onOrderStatusChanged) {
		dispatcher.on(EventTypes.ORDER_STATUS_CHANGED, onOrderStatusChanged);
	}

	if (onOrderCancelled) {
		dispatcher.on(EventTypes.ORDER_CANCELLED, onOrderCancelled);
	}

	if (onOrderCompleted) {
		dispatcher.on(EventTypes.ORDER_COMPLETED, onOrderCompleted);
	}
}

module.exports = {
	dispatchOrderCreated,
	dispatchOrderStatusChanged,
	dispatchOrderCancelled,
	dispatchOrderCompleted,
	registerOrderEventHandlers
};