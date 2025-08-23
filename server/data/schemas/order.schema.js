// src/data/schemas/order.schema.js

const mongoose = require('mongoose');

/**
 * @schema OrderSchema
 * @description Mongoose schema for order data storage
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
const OrderSchema = new mongoose.Schema({
	orderNumber: {
		type: String,
		required: true,
		unique: true,
		index: true
	},
	clientId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Client',
		required: true,
		index: true
	},
	items: [{
		productId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Product',
			required: true
		},
		name: {
			type: String,
			required: true
		},
		quantity: {
			type: Number,
			required: true,
			min: [1, 'Quantity must be at least 1']
		},
		unit: {
			type: String,
			required: true
		},
		price: {
			type: Number,
			required: true,
			min: [0, 'Price cannot be negative']
		},
		totalPrice: {
			type: Number,
			required: true,
			min: [0, 'Total price cannot be negative']
		},
		notes: String
	}],
	status: {
		type: String,
		enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
		default: 'pending',
		index: true
	},
	paymentStatus: {
		type: String,
		enum: ['pending', 'paid', 'partially_paid', 'refunded', 'failed'],
		default: 'pending',
		index: true
	},
	paymentMethod: {
		type: String,
		enum: ['bank_transfer', 'cash', 'credit_card', 'online_payment', 'other'],
		default: 'bank_transfer'
	},
	shippingMethod: {
		type: String,
		enum: ['delivery', 'pickup'],
		default: 'delivery'
	},
	shippingAddress: {
		street: {
			type: String,
			trim: true
		},
		city: {
			type: String,
			trim: true
		},
		state: {
			type: String,
			trim: true
		},
		country: {
			type: String,
			trim: true,
			default: 'Nigeria'
		},
		postalCode: {
			type: String,
			trim: true
		}
	},
	contactInfo: {
		name: String,
		email: String,
		phone: String
	},
	subtotal: {
		type: Number,
		required: true,
		min: [0, 'Subtotal cannot be negative']
	},
	shippingCost: {
		type: mongoose.Schema.Types.Mixed, // Allow both Number and String for "TBD"
		default: 0,
		validate: {
			validator: function(value) {
				// Allow numbers >= 0 or the string "TBD"
				return (typeof value === 'number' && value >= 0) || value === 'TBD';
			},
			message: 'Shipping cost must be a non-negative number or "TBD"'
		}
	},
	taxAmount: {
		type: Number,
		default: 0,
		min: [0, 'Tax amount cannot be negative']
	},
	discountAmount: {
		type: Number,
		default: 0,
		min: [0, 'Discount amount cannot be negative']
	},
	totalAmount: {
		type: mongoose.Schema.Types.Mixed, // Allow both Number and String for "TBD"
		required: true,
		validate: {
			validator: function(value) {
				// Allow numbers >= 0 or the string "TBD"
				return (typeof value === 'number' && value >= 0) || value === 'TBD';
			},
			message: 'Total amount must be a non-negative number or "TBD"'
		}
	},
	// New field to track if delivery fee is pending calculation
	deliveryFeePending: {
		type: Boolean,
		default: false
	},
	// Actual delivery fee once calculated
	calculatedDeliveryFee: {
		type: Number,
		min: [0, 'Calculated delivery fee cannot be negative']
	},
	// Final total once delivery fee is calculated
	finalTotalAmount: {
		type: Number,
		min: [0, 'Final total amount cannot be negative']
	},
	notes: {
		type: String,
		trim: true
	},
	deliveryNotes: {
		type: String,
		trim: true
	},
	deliveryDate: {
		type: Date
	},
	deliveryTimeSlot: {
		type: String,
		trim: true
	},
	trackingNumber: {
		type: String,
		trim: true
	},
	statusHistory: [{
		status: {
			type: String,
			required: true
		},
		timestamp: {
			type: Date,
			default: Date.now
		},
		note: String,
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	}],
	invoiceId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Invoice'
	}
}, {
	timestamps: true,
	toJSON: { virtuals: true },
	toObject: { virtuals: true }
});

// Indexes
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ deliveryDate: 1 });
OrderSchema.index({ deliveryFeePending: 1 });

// Virtual for client data
OrderSchema.virtual('client', {
	ref: 'Client',
	localField: 'clientId',
	foreignField: '_id',
	justOne: true
});

// Virtual for invoice
OrderSchema.virtual('invoice', {
	ref: 'Invoice',
	localField: 'invoiceId',
	foreignField: '_id',
	justOne: true
});

// Calculate totals before saving
OrderSchema.pre('save', function(next) {
	try {
		// Ensure orderNumber exists
		if (!this.orderNumber) {
			this.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		}

		// Calculate item total prices if not set
		this.items.forEach(item => {
			if (!item.totalPrice) {
				item.totalPrice = item.price * item.quantity;
			}
		});

		// Calculate subtotal from items
		if (!this.subtotal || this.subtotal === 0) {
			this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
		}

		// Handle shipping cost and total amount logic
		if (this.shippingMethod === 'delivery') {
			// For delivery orders, check if shipping cost is provided
			if (this.shippingCost === 'TBD' || this.shippingCost === undefined) {
				this.shippingCost = 'TBD';
				this.totalAmount = 'TBD';
				this.deliveryFeePending = true;
			} else if (typeof this.shippingCost === 'number') {
				// Shipping cost is provided, calculate total
				this.deliveryFeePending = false;
				this.calculatedDeliveryFee = this.shippingCost;
				this.totalAmount = this.subtotal + this.shippingCost + (this.taxAmount || 0) - (this.discountAmount || 0);
				this.finalTotalAmount = this.totalAmount;
			}
		} else {
			// For pickup orders, no shipping cost
			this.shippingCost = 0;
			this.deliveryFeePending = false;
			this.totalAmount = this.subtotal + (this.taxAmount || 0) - (this.discountAmount || 0);
			this.finalTotalAmount = this.totalAmount;
		}

		// Ensure numeric values are set for calculation fields
		this.taxAmount = this.taxAmount || 0;
		this.discountAmount = this.discountAmount || 0;

		// Add to status history if status changed or if this is new document
		if (this.isModified('status') || this.isNew) {
			this.statusHistory.push({
				status: this.status,
				timestamp: new Date(),
				note: this.isNew ? 'Order created' : 'Status updated'
			});
		}

		next();
	} catch (error) {
		next(error);
	}
});

/**
 * Update order status
 * @param {string} status - New status
 * @param {Object} options - Additional options (note, updatedBy)
 */
OrderSchema.methods.updateStatus = function(status, options = {}) {
	this.status = status;

	this.statusHistory.push({
		status: status,
		timestamp: new Date(),
		note: options.note || '',
		updatedBy: options.updatedBy
	});
};

/**
 * Update payment status
 * @param {string} paymentStatus - New payment status
 */
OrderSchema.methods.updatePaymentStatus = function(paymentStatus) {
	this.paymentStatus = paymentStatus;
};

/**
 * Add tracking number
 * @param {string} trackingNumber - Shipping tracking number
 */
OrderSchema.methods.addTrackingNumber = function(trackingNumber) {
	this.trackingNumber = trackingNumber;

	// If order status is pending or processing, update to shipped
	if (['pending', 'processing'].includes(this.status)) {
		this.updateStatus('shipped', { note: 'Tracking number added' });
	}
};

/**
 * Set delivery date
 * @param {Date} date - Delivery date
 * @param {string} timeSlot - Optional time slot
 */
OrderSchema.methods.setDeliveryDate = function(date, timeSlot = '') {
	this.deliveryDate = date;
	this.deliveryTimeSlot = timeSlot;
};

/**
 * Update delivery fee and calculate final totals
 * @param {number} deliveryFee - Calculated delivery fee
 */
OrderSchema.methods.updateDeliveryFee = function(deliveryFee) {
	if (typeof deliveryFee !== 'number' || deliveryFee < 0) {
		throw new Error('Delivery fee must be a non-negative number');
	}

	this.shippingCost = deliveryFee;
	this.calculatedDeliveryFee = deliveryFee;
	this.deliveryFeePending = false;

	// Recalculate total amount
	this.totalAmount = this.subtotal + deliveryFee + (this.taxAmount || 0) - (this.discountAmount || 0);
	this.finalTotalAmount = this.totalAmount;

	// Add to status history
	this.statusHistory.push({
		status: this.status,
		timestamp: new Date(),
		note: `Delivery fee updated: ₦${deliveryFee.toLocaleString()}`
	});
};

/**
 * Check if order has pending delivery fee calculation
 * @returns {boolean} True if delivery fee is pending
 */
OrderSchema.methods.hasDeliveryFeePending = function() {
	return this.deliveryFeePending === true;
};

/**
 * Get display total (handles TBD case)
 * @returns {string|number} Display total
 */
OrderSchema.methods.getDisplayTotal = function() {
	if (this.deliveryFeePending || this.totalAmount === 'TBD') {
		return `₦${this.subtotal.toLocaleString()} + delivery fee`;
	}
	return typeof this.totalAmount === 'number' ? this.totalAmount : 0;
};

/**
 * Calculate order metrics
 * @returns {Object} Order metrics
 */
OrderSchema.methods.getMetrics = function() {
	// Calculate total quantity
	const totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);

	// Calculate unique products count
	const uniqueProductsCount = new Set(this.items.map(item => item.productId.toString())).size;

	return {
		totalQuantity,
		uniqueProductsCount,
		subtotal: this.subtotal,
		shippingCost: this.shippingCost,
		totalAmount: this.totalAmount,
		deliveryFeePending: this.deliveryFeePending,
		finalTotalAmount: this.finalTotalAmount
	};
};

module.exports = mongoose.model('Order', OrderSchema);