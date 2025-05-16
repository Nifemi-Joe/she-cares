// src/domain/models/order.model.js

/**
 * @class Order
 * @description Order domain model for managing client purchases
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */
class Order {
	/**
	 * Create a new Order instance
	 * @param {Object} orderData - Order information
	 * @param {string} orderData.id - Unique identifier
	 * @param {string} orderData.clientId - ID of client placing order
	 * @param {Array} orderData.items - Order line items
	 * @param {string} orderData.deliveryMethod - Delivery or Pickup
	 * @param {Object} orderData.deliveryAddress - Delivery address (if applicable)
	 * @param {string} orderData.status - Order status
	 * @param {number} orderData.subtotal - Order subtotal
	 * @param {number} orderData.deliveryFee - Delivery fee
	 * @param {number} orderData.discount - Applied discount
	 * @param {number} orderData.total - Order total
	 * @param {Object} orderData.paymentDetails - Payment information
	 * @param {string} orderData.notes - Order notes
	 * @param {Date} orderData.createdAt - Creation timestamp
	 * @param {Date} orderData.updatedAt - Last update timestamp
	 */
	constructor({
		            id,
		            clientId,
		            items = [],
		            deliveryMethod = 'pickup',
		            deliveryAddress = null,
		            status = 'pending',
		            subtotal = 0,
		            deliveryFee = 0,
		            discount = 0,
		            total = 0,
		            paymentDetails = {
			            method: 'bank_transfer',
			            status: 'pending'
		            },
		            notes = '',
		            createdAt = new Date(),
		            updatedAt = new Date()
	            }) {
		this.id = id;
		this.clientId = clientId;
		this.items = items;
		this.deliveryMethod = deliveryMethod;
		this.deliveryAddress = deliveryAddress;
		this.status = status;
		this.subtotal = subtotal;
		this.deliveryFee = deliveryFee;
		this.discount = discount;
		this.total = total;
		this.paymentDetails = paymentDetails;
		this.notes = notes;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;

		// Track order history
		this.statusHistory = [
			{
				status: this.status,
				timestamp: new Date(),
				note: 'Order created'
			}
		];
	}

	/**
	 * Add an item to the order
	 * @param {Object} item - Order line item
	 * @param {string} item.productId - Product ID
	 * @param {string} item.name - Product name
	 * @param {number} item.price - Unit price
	 * @param {number} item.quantity - Quantity ordered
	 * @param {string} item.variant - Product variant (if applicable)
	 * @param {string} item.notes - Item-specific notes
	 * @returns {string} - Generated item ID
	 */
	addItem(item) {
		const itemId = `item_${Date.now()}`;
		this.items.push({
			id: itemId,
			...item,
			subtotal: item.price * item.quantity
		});
		this.recalculateTotals();
		return itemId;
	}

	/**
	 * Remove an item from the order
	 * @param {string} itemId - ID of item to remove
	 * @returns {boolean} Whether item was found and removed
	 */
	removeItem(itemId) {
		const initialLength = this.items.length;
		this.items = this.items.filter(item => item.id !== itemId);

		if (this.items.length !== initialLength) {
			this.recalculateTotals();
			return true;
		}

		return false;
	}

	/**
	 * Update quantity of an existing order item
	 * @param {string} itemId - ID of item to update
	 * @param {number} newQuantity - New quantity
	 * @returns {boolean} Whether item was found and updated
	 */
	updateItemQuantity(itemId, newQuantity) {
		const item = this.items.find(item => item.id === itemId);

		if (item) {
			item.quantity = newQuantity;
			item.subtotal = item.price * newQuantity;
			this.recalculateTotals();
			return true;
		}

		return false;
	}

	/**
	 * Recalculate order totals
	 */
	recalculateTotals() {
		this.subtotal = this.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
		this.total = this.subtotal + this.deliveryFee - this.discount;
		this.updatedAt = new Date();
	}

	/**
	 * Update order status
	 * @param {string} newStatus - New status value
	 * @param {string} note - Optional note explaining status change
	 * @returns {Object} Event data for domain events
	 */
	updateStatus(newStatus, note = '') {
		this.status = newStatus;
		this.statusHistory.push({
			status: newStatus,
			timestamp: new Date(),
			note: note || `Status changed to ${newStatus}`
		});
		this.updatedAt = new Date();

		// Return event data for domain events
		return {
			event: 'ORDER_STATUS_CHANGED',
			orderId: this.id,
			clientId: this.clientId,
			previousStatus: this.statusHistory[this.statusHistory.length - 2]?.status,
			newStatus: newStatus
		};
	}

	/**
	 * Set delivery method and address
	 * @param {string} method - "delivery" or "pickup"
	 * @param {Object} address - Delivery address (required if method is "delivery")
	 * @param {number} fee - Delivery fee
	 */
	setDeliveryMethod(method, address = null, fee = 0) {
		this.deliveryMethod = method;

		if (method === 'delivery' && !address) {
			throw new Error('Delivery address is required for delivery orders');
		}

		this.deliveryAddress = method === 'delivery' ? address : null;
		this.deliveryFee = method === 'delivery' ? fee : 0;
		this.recalculateTotals();
		this.updatedAt = new Date();
	}

	/**
	 * Apply discount to the order
	 * @param {number} amount - Discount amount
	 * @param {string} reason - Reason for discount
	 */
	applyDiscount(amount, reason = '') {
		this.discount = amount;
		this.notes += `\n[${new Date().toISOString()}] Discount applied: ${amount}. Reason: ${reason}`;
		this.recalculateTotals();
	}

	/**
	 * Update payment details
	 * @param {Object} details - Payment details
	 * @param {string} details.method - Payment method
	 * @param {string} details.status - Payment status
	 * @param {string} details.reference - Payment reference
	 * @param {Date} details.paidAt - Payment date
	 */
	updatePayment(details) {
		this.paymentDetails = {
			...this.paymentDetails,
			...details
		};

		if (details.status === 'paid' && this.status === 'pending') {
			this.updateStatus('processing', 'Payment received');
		}

		this.updatedAt = new Date();
	}

	/**
	 * Check if order is eligible for fulfillment
	 * @returns {boolean} Whether order can be fulfilled
	 */
	canFulfill() {
		return ['processing', 'ready'].includes(this.status) &&
			this.paymentDetails.status === 'paid';
	}

	/**
	 * Add a note to the order
	 * @param {string} note - Note text
	 * @param {string} author - Note author
	 */
	addNote(note, author = 'system') {
		const timestamp = new Date().toISOString();
		this.notes = this.notes
			? `${this.notes}\n[${timestamp}][${author}]: ${note}`
			: `[${timestamp}][${author}]: ${note}`;

		this.updatedAt = new Date();
	}

	/**
	 * Convert to plain object for serialization
	 * @returns {Object} Plain JavaScript object
	 */
	toJSON() {
		return {
			id: this.id,
			clientId: this.clientId,
			items: this.items,
			deliveryMethod: this.deliveryMethod,
			deliveryAddress: this.deliveryAddress,
			status: this.status,
			subtotal: this.subtotal,
			deliveryFee: this.deliveryFee,
			discount: this.discount,
			total: this.total,
			paymentDetails: this.paymentDetails,
			notes: this.notes,
			statusHistory: this.statusHistory,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		};
	}
}

module.exports = Order;