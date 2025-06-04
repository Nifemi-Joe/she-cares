// src/domain/models/order.model.js

class Order {
	constructor({
		            orderNumber,           // Changed from 'id'
		            clientId,
		            items = [],
		            shippingMethod = 'pickup',    // Changed from 'deliveryMethod'
		            shippingAddress = null,       // Changed from 'deliveryAddress'
		            status = 'pending',
		            subtotal = 0,
		            shippingCost = 0,            // Changed from 'deliveryFee'
		            taxAmount = 0,               // Added
		            discountAmount = 0,          // Changed from 'discount'
		            totalAmount = 0,             // Changed from 'total'
		            paymentStatus = 'pending',   // Extracted from paymentDetails
		            paymentMethod = 'bank_transfer', // Extracted from paymentDetails
		            contactInfo = {},            // Added
		            notes = '',
		            deliveryNotes = '',          // Added
		            deliveryDate = null,         // Added
		            deliveryTimeSlot = '',       // Added
		            trackingNumber = '',         // Added
		            createdAt = new Date(),
		            updatedAt = new Date()
	            }) {
		this.orderNumber = orderNumber;
		this.clientId = clientId;
		this.items = items;
		this.shippingMethod = shippingMethod;
		this.shippingAddress = shippingAddress;
		this.status = status;
		this.subtotal = subtotal;
		this.shippingCost = shippingCost;
		this.taxAmount = taxAmount;
		this.discountAmount = discountAmount;
		this.totalAmount = totalAmount;
		this.paymentStatus = paymentStatus;
		this.paymentMethod = paymentMethod;
		this.contactInfo = contactInfo;
		this.notes = notes;
		this.deliveryNotes = deliveryNotes;
		this.deliveryDate = deliveryDate;
		this.deliveryTimeSlot = deliveryTimeSlot;
		this.trackingNumber = trackingNumber;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;

		// Initialize status history
		this.statusHistory = [
			{
				status: this.status,
				timestamp: new Date(),
				note: 'Order created'
			}
		];
	}

	/**
	 * Recalculate order totals
	 */
	recalculateTotals() {
		// Calculate item totals
		this.items.forEach(item => {
			if (!item.totalPrice) {
				item.totalPrice = item.price * item.quantity;
			}
		});

		// Calculate subtotal
		this.subtotal = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

		// Calculate total amount
		this.totalAmount = this.subtotal + this.shippingCost + this.taxAmount - this.discountAmount;

		this.updatedAt = new Date();
	}

	/**
	 * Set delivery method and address
	 */
	setShippingMethod(method, address = null, cost = 0) {
		this.shippingMethod = method;

		if (method === 'delivery' && !address) {
			throw new Error('Shipping address is required for delivery orders');
		}

		this.shippingAddress = method === 'delivery' ? address : null;
		this.shippingCost = method === 'delivery' ? cost : 0;
		this.recalculateTotals();
		this.updatedAt = new Date();
	}

	/**
	 * Apply discount to the order
	 */
	applyDiscount(amount, reason = '') {
		this.discountAmount = amount;
		this.addNote(`Discount applied: ${amount}. Reason: ${reason}`);
		this.recalculateTotals();
	}

	/**
	 * Update payment details
	 */
	updatePayment(paymentStatus, paymentMethod = null) {
		this.paymentStatus = paymentStatus;
		if (paymentMethod) {
			this.paymentMethod = paymentMethod;
		}

		if (paymentStatus === 'paid' && this.status === 'pending') {
			this.updateStatus('processing', 'Payment received');
		}

		this.updatedAt = new Date();
	}

	/**
	 * Convert to plain object for serialization
	 */
	toJSON() {
		return {
			orderNumber: this.orderNumber,
			clientId: this.clientId,
			items: this.items,
			status: this.status,
			paymentStatus: this.paymentStatus,
			paymentMethod: this.paymentMethod,
			shippingMethod: this.shippingMethod,
			shippingAddress: this.shippingAddress,
			contactInfo: this.contactInfo,
			subtotal: this.subtotal,
			shippingCost: this.shippingCost,
			taxAmount: this.taxAmount,
			discountAmount: this.discountAmount,
			totalAmount: this.totalAmount,
			notes: this.notes,
			deliveryNotes: this.deliveryNotes,
			deliveryDate: this.deliveryDate,
			deliveryTimeSlot: this.deliveryTimeSlot,
			trackingNumber: this.trackingNumber,
			statusHistory: this.statusHistory,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		};
	}

	// ... rest of your methods with updated field names
}

module.exports = Order;
