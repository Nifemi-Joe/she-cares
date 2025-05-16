// src/data/schemas/product.schema.js

const mongoose = require('mongoose');

/**
 * @schema ProductSchema
 * @description Mongoose schema for product data storage
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
const ProductSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Product name is required'],
		trim: true,
		index: true
	},
	description: {
		type: String,
		trim: true
	},
	sku: {
		type: String,
		trim: true,
		unique: true,
		sparse: true // allows null/undefined values
	},
	categoryId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Category',
		required: [true, 'Category is required'],
		index: true
	},
	price: {
		type: Number,
		required: [true, 'Price is required'],
		min: [0, 'Price cannot be negative']
	},
	pricingUnit: {
		type: String,
		enum: ['each', 'kg', 'g', 'lb', 'oz', 'l', 'ml', 'basket', 'portion', 'piece', 'bunch'],
		default: 'each'
	},
	costPrice: {
		type: Number,
		min: [0, 'Cost price cannot be negative']
	},
	stockQuantity: {
		type: Number,
		default: 0,
		min: [0, 'Stock quantity cannot be negative']
	},
	stockUnit: {
		type: String,
		enum: ['each', 'kg', 'g', 'lb', 'oz', 'l', 'ml', 'basket', 'portion', 'piece', 'bunch'],
		default: 'each'
	},
	lowStockThreshold: {
		type: Number,
		default: 5
	},
	isAvailable: {
		type: Boolean,
		default: true,
		index: true
	},
	isFeatured: {
		type: Boolean,
		default: false,
		index: true
	},
	images: [{
		url: {
			type: String,
			trim: true
		},
		alt: {
			type: String,
			trim: true
		},
		isDefault: {
			type: Boolean,
			default: false
		}
	}],
	tags: [{
		type: String,
		trim: true
	}],
	attributes: {
		type: Map,
		of: String
	},
	nutritionalInfo: {
		calories: Number,
		protein: Number,
		carbs: Number,
		fat: Number,
		fiber: Number,
		additionalInfo: String
	},
	salesCount: {
		type: Number,
		default: 0
	},
	viewCount: {
		type: Number,
		default: 0
	},
	supplierInfo: {
		name: String,
		contactInfo: String,
		minimumOrderQuantity: Number
	}
}, {
	timestamps: true,
	toJSON: { virtuals: true },
	toObject: { virtuals: true }
});

// Indexes
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ 'attributes.key': 1, 'attributes.value': 1 });

// Virtual for checking if product is in stock
ProductSchema.virtual('inStock').get(function() {
	return this.isAvailable && this.stockQuantity > 0;
});

// Virtual for checking if product is low on stock
ProductSchema.virtual('isLowStock').get(function() {
	return this.stockQuantity > 0 && this.stockQuantity <= this.lowStockThreshold;
});

// Virtual for populating category
ProductSchema.virtual('category', {
	ref: 'Category',
	localField: 'categoryId',
	foreignField: '_id',
	justOne: true
});

/**
 * Update stock quantity
 * @param {number} quantity - Quantity to add (positive) or remove (negative)
 * @returns {Promise<boolean>} Whether update was successful
 */
ProductSchema.methods.updateStock = async function(quantity) {
	const newQuantity = this.stockQuantity + quantity;
	if (newQuantity < 0) {
		return false;
	}

	this.stockQuantity = newQuantity;
	await this.save();
	return true;
};

/**
 * Increment sales count
 * @param {number} quantity - Quantity sold
 * @returns {Promise<void>}
 */
ProductSchema.methods.incrementSales = async function(quantity = 1) {
	this.salesCount += quantity;
	await this.save();
};

/**
 * Increment view count
 * @returns {Promise<void>}
 */
ProductSchema.methods.incrementView = async function() {
	this.viewCount += 1;
	await this.save();
};

module.exports = mongoose.model('Product', ProductSchema);