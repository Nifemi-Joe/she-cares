// src/data/schemas/client.schema.js

const mongoose = require('mongoose');

/**
 * @schema ClientSchema
 * @description Mongoose schema for client/customer data storage
 * @since v1.2.0 (2023)
 * @author SheCares Development Team
 */
const ClientSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Client name is required'],
		trim: true,
		index: true
	},
	email: {
		type: String,
		trim: true,
		lowercase: true,
		index: true,
		sparse: true, // allows null/undefined values
		match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
	},
	phone: {
		type: String,
		trim: true,
		index: true,
		sparse: true // allows null/undefined values
	},
	address: {
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
	deliveryLocations: [{
		id: {
			type: String,
			required: true
		},
		name: {
			type: String,
			trim: true
		},
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
		},
		createdAt: {
			type: Date,
			default: Date.now
		}
	}],
	preferredContactMethod: {
		type: String,
		enum: ['email', 'phone'],
		default: 'email'
	},
	preferences: {
		type: Map,
		of: mongoose.Schema.Types.Mixed
	},
	notes: {
		type: String,
		trim: true
	},
	lastOrderDate: {
		type: Date
	},
	totalOrders: {
		type: Number,
		default: 0
	},
	totalSpent: {
		type: Number,
		default: 0
	},
	tags: [{
		type: String,
		trim: true
	}],
	referralSource: {
		type: String,
		trim: true
	},
	isActive: {
		type: Boolean,
		default: true
	}
}, {
	timestamps: true,
	toJSON: { virtuals: true },
	toObject: { virtuals: true }
});

// Indexes
ClientSchema.index({ name: 'text', 'address.city': 'text', 'address.state': 'text', notes: 'text' });
ClientSchema.index({ 'preferences.key': 1, 'preferences.value': 1 });

// Make sure at least email or phone is provided
ClientSchema.pre('validate', function(next) {
	if (!this.email && !this.phone) {
		this.invalidate('email', 'Either email or phone is required');
	}
	next();
});

// Virtual for recent orders
ClientSchema.virtual('recentOrders', {
	ref: 'Order',
	localField: '_id',
	foreignField: 'clientId',
	options: {
		sort: { createdAt: -1 },
		limit: 5
	}
});

/**
 * Add a delivery location
 * @param {Object} location - Location data
 * @returns {string} Location ID
 */
ClientSchema.methods.addDeliveryLocation = function(location) {
	const locationId = `loc_${Date.now()}`;
	this.deliveryLocations.push({
		id: locationId,
		...location,
		createdAt: new Date()
	});

	return locationId;
};

/**
 * Remove a delivery location
 * @param {string} locationId - Location ID
 * @returns {boolean} Whether location was removed
 */
ClientSchema.methods.removeDeliveryLocation = function(locationId) {
	const initialLength = this.deliveryLocations.length;
	this.deliveryLocations = this.deliveryLocations.filter(loc => loc.id !== locationId);

	return this.deliveryLocations.length !== initialLength;
};

/**
 * Add a tag to client
 * @param {string} tag - Tag to add
 * @returns {boolean} Whether tag was added
 */
ClientSchema.methods.addTag = function(tag) {
	if (!this.tags.includes(tag)) {
		this.tags.push(tag);
		return true;
	}
	return false;
};

/**
 * Remove a tag from client
 * @param {string} tag - Tag to remove
 * @returns {boolean} Whether tag was removed
 */
ClientSchema.methods.removeTag = function(tag) {
	const initialLength = this.tags.length;
	this.tags = this.tags.filter(t => t !== tag);

	return this.tags.length !== initialLength;
};

/**
 * Update order statistics
 * @param {number} orderAmount - Order amount
 */
ClientSchema.methods.recordOrder = function(orderAmount) {
	this.totalOrders += 1;
	this.totalSpent += orderAmount;
	this.lastOrderDate = new Date();
};

/**
 * Get contact info based on preferred method
 * @returns {Object} Contact info
 */
ClientSchema.methods.getContactInfo = function() {
	return {
		method: this.preferredContactMethod,
		value: this.preferredContactMethod === 'email' ? this.email : this.phone
	};
};

module.exports = mongoose.model('Client', ClientSchema);