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
		type: Number,
		default: 0,
		min: [0, 'Shipping cost cannot be negative']
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
		type: Number,
		required: true,
		min: [0, 'Total amount cannot be negative']
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
	// Calculate item total prices if not set
	this.items.forEach(item => {
		if (!item.totalPrice) {
			item.totalPrice = item.price * item.quantity;
		}
	});

	// Calculate subtotal from items
	if (!this.subtotal) {
		this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
	}

	// Calculate total amount
	this.totalAmount = this.subtotal + this.shippingCost + this.taxAmount - this.discountAmount;

	// Add to status history if status changed
	if (this.isModified('status')) {
		this.statusHistory.push({
			status: this.status,
			timestamp: new Date(),
			note: 'Status updated'
		});
	}

	next();
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
		totalAmount: this.totalAmount
	};
};

module.exports = mongoose.model('Order', OrderSchema);