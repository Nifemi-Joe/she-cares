// src/data/schemas/delivery.schema.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Delivery Location Schema
 */
const DeliveryLocationSchema = new Schema({
	street: {
		type: String,
		required: true
	},
	city: {
		type: String,
		required: true
	},
	state: {
		type: String,
		required: true
	},
	country: {
		type: String,
		default: 'Nigeria'
	},
	postalCode: {
		type: String
	},
	landmark: {
		type: String
	},
	coordinates: {
		type: {
			lat: Number,
			lng: Number
		}
	},
	isDefault: {
		type: Boolean,
		default: false
	}
});

/**
 * Delivery Status History Schema - Used as a sub-document
 */
const DeliveryStatusHistorySchema = new Schema({
	status: {
		type: String,
		enum: ['pending', 'scheduled', 'in_transit', 'delivered', 'failed', 'cancelled'],
		required: true
	},
	timestamp: {
		type: Date,
		default: Date.now
	},
	notes: {
		type: String
	},
	updatedBy: {
		type: Schema.Types.ObjectId,
		ref: 'User'
	}
});

/**
 * Delivery Schema
 */
const DeliverySchema = new Schema({
	orderId: {
		type: Schema.Types.ObjectId,
		ref: 'Order',
		required: true,
		index: true
	},
	clientId: {
		type: Schema.Types.ObjectId,
		ref: 'Client',
		required: true,
		index: true
	},
	deliveryMethod: {
		type: String,
		enum: ['pickup', 'delivery'],
		default: 'delivery'
	},
	status: {
		type: String,
		enum: ['pending', 'scheduled', 'in_transit', 'delivered', 'failed', 'cancelled'],
		default: 'pending',
		index: true
	},
	statusHistory: [DeliveryStatusHistorySchema],
	trackingNumber: {
		type: String,
		unique: true,
		sparse: true
	},
	scheduledDate: {
		type: Date
	},
	deliveredAt: {
		type: Date
	},
	estimatedDeliveryTime: {
		type: String
	},
	deliveryLocation: DeliveryLocationSchema,
	deliveryFee: {
		type: Number,
		default: 0
	},
	deliveryNotes: {
		type: String
	},
	recipientName: {
		type: String,
		required: true
	},
	recipientPhone: {
		type: String,
		required: true
	},
	deliveryPersonnel: {
		type: Schema.Types.ObjectId,
		ref: 'User'
	},
	deliveryPersonnelName: {
		type: String
	},
	deliveryPersonnelPhone: {
		type: String
	},
	proofOfDelivery: {
		type: String // URL to image or document
	},
	signatureRequired: {
		type: Boolean,
		default: false
	},
	priority: {
		type: String,
		enum: ['standard', 'express', 'priority'],
		default: 'standard'
	},
	isFreeDelivery: {
		type: Boolean,
		default: false
	},
	createdAt: {
		type: Date,
		default: Date.now,
		index: true
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
});

// Pre-save hook to generate tracking number if not present
DeliverySchema.pre('save', function(next) {
	if (!this.trackingNumber) {
		// Generate a unique tracking number: DEL-YYYYMMDD-XXXX
		const date = new Date();
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number

		this.trackingNumber = `DEL-${year}${month}${day}-${random}`;
	}
	next();
});

// Pre-save middleware to update statusHistory
DeliverySchema.pre('save', function(next) {
	// If the status is being modified and it's not a new document
	if (this.isModified('status') && !this.isNew) {
		this.statusHistory.push({
			status: this.status,
			timestamp: new Date(),
			notes: `Status updated to ${this.status}`
		});
	}

	// If this is a new delivery, add the initial status
	if (this.isNew) {
		this.statusHistory = [{
			status: this.status,
			timestamp: new Date(),
			notes: 'Delivery created'
		}];
	}

	// Update the updatedAt field
	this.updatedAt = new Date();
	next();
});

// Set toJSON option for clean output
DeliverySchema.set('toJSON', {
	transform: (doc, ret) => {
		ret.id = ret._id.toString();
		delete ret._id;
		delete ret.__v;
		return ret;
	}
});

// Create model
const Delivery = mongoose.model('Delivery', DeliverySchema);

module.exports = Delivery;