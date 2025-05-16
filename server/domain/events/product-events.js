// src/domain/events/product-events.js

const EventTypes = require('./event-types');
const dispatcher = require('./event-dispatcher');

/**
 * Product event handlers and dispatchers
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

/**
 * Dispatch a product created event
 * @param {Product} product - Newly created product
 */
function dispatchProductCreated(product) {
	return dispatcher.dispatch(EventTypes.PRODUCT_CREATED, {
		productId: product.id,
		name: product.name,
		categoryId: product.categoryId,
		price: product.price,
		stockQuantity: product.stockQuantity,
		timestamp: new Date()
	});
}

/**
 * Dispatch a product updated event
 * @param {Product} product - Updated product
 * @param {Object} changes - Fields that were changed
 */
function dispatchProductUpdated(product, changes) {
	return dispatcher.dispatch(EventTypes.PRODUCT_UPDATED, {
		productId: product.id,
		name: product.name,
		changes,
		timestamp: new Date()
	});
}

/**
 * Dispatch a product deleted event
 * @param {string} productId - ID of deleted product
 * @param {string} productName - Name of deleted product
 */
function dispatchProductDeleted(productId, productName) {
	return dispatcher.dispatch(EventTypes.PRODUCT_DELETED, {
		productId,
		name: productName,
		timestamp: new Date()
	});
}

/**
 * Dispatch a low stock warning event
 * @param {Product} product - Product with low stock
 * @param {number} threshold - Low stock threshold
 */
function dispatchProductLowStock(product, threshold) {
	return dispatcher.dispatch(EventTypes.PRODUCT_STOCK_LOW, {
		productId: product.id,
		name: product.name,
		currentStock: product.stockQuantity,
		threshold,
		timestamp: new Date()
	});
}

/**
 * Dispatch an out of stock event
 * @param {Product} product - Product that is out of stock
 */
function dispatchProductOutOfStock(product) {
	return dispatcher.dispatch(EventTypes.PRODUCT_OUT_OF_STOCK, {
		productId: product.id,
		name: product.name,
		timestamp: new Date()
	});
}

/**
 * Dispatch a back in stock event
 * @param {Product} product - Product that is back in stock
 * @param {number} newQuantity - New stock quantity
 */
function dispatchProductBackInStock(product, newQuantity) {
	return dispatcher.dispatch(EventTypes.PRODUCT_BACK_IN_STOCK, {
		productId: product.id,
		name: product.name,
		newQuantity,
		timestamp: new Date()
	});
}

/**
 * Register handlers for product events
 * @param {Function} onProductCreated - Handler for product created events
 * @param {Function} onProductUpdated - Handler for product updated events
 * @param {Function} onProductDeleted - Handler for product deleted events
 * @param {Function} onProductLowStock - Handler for low stock events
 * @param {Function} onProductOutOfStock - Handler for out of stock events
 * @param {Function} onProductBackInStock - Handler for back in stock events
 */
function registerProductEventHandlers({
	                                      onProductCreated,
	                                      onProductUpdated,
	                                      onProductDeleted,
	                                      onProductLowStock,
	                                      onProductOutOfStock,
	                                      onProductBackInStock
                                      }) {
	if (onProductCreated) {
		dispatcher.on(EventTypes.PRODUCT_CREATED, onProductCreated);
	}

	if (onProductUpdated) {
		dispatcher.on(EventTypes.PRODUCT_UPDATED, onProductUpdated);
	}

	if (onProductDeleted) {
		dispatcher.on(EventTypes.PRODUCT_DELETED, onProductDeleted);
	}

	if (onProductLowStock) {
		dispatcher.on(EventTypes.PRODUCT_STOCK_LOW, onProductLowStock);
	}

	if (onProductOutOfStock) {
		dispatcher.on(EventTypes.PRODUCT_OUT_OF_STOCK, onProductOutOfStock);
	}

	if (onProductBackInStock) {
		dispatcher.on(EventTypes.PRODUCT_BACK_IN_STOCK, onProductBackInStock);
	}
}

module.exports = {
	dispatchProductCreated,
	dispatchProductUpdated,
	dispatchProductDeleted,
	dispatchProductLowStock,
	dispatchProductOutOfStock,
	dispatchProductBackInStock,
	registerProductEventHandlers
};