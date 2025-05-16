// src/data/schemas/category.schema.js

const mongoose = require('mongoose');

/**
 * @schema CategorySchema
 * @description Mongoose schema for product category data storage
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
const CategorySchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Category name is required'],
		unique: true,
		trim: true,
		index: true
	},
	description: {
		type: String,
		trim: true
	},
	slug: {
		type: String,
		lowercase: true,
		trim: true,
		unique: true,
		index: true
	},
	parentId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Category',
		default: null
	},
	image: {
		url: {
			type: String,
			trim: true
		},
		alt: {
			type: String,
			trim: true
		}
	},
	isActive: {
		type: Boolean,
		default: true
	},
	displayOrder: {
		type: Number,
		default: 0
	},
	metadata: {
		type: Map,
		of: String
	}
}, {
	timestamps: true,
	toJSON: { virtuals: true },
	toObject: { virtuals: true }
});

// Indexes
CategorySchema.index({ name: 'text', description: 'text' });

// Auto-generate slug if not provided
CategorySchema.pre('save', function(next) {
	if (!this.slug && this.name) {
		// Convert name to slug format (lowercase, hyphenated)
		this.slug = this.name
			.toLowerCase()
			.replace(/\s+/g, '-')       // Replace spaces with -
			.replace(/[^\w\-]+/g, '')   // Remove all non-word chars
			.replace(/\-\-+/g, '-')     // Replace multiple - with single -
			.replace(/^-+/, '')         // Trim - from start of text
			.replace(/-+$/, '');        // Trim - from end of text
	}
	next();
});

// Virtual for subcategories
CategorySchema.virtual('subcategories', {
	ref: 'Category',
	localField: '_id',
	foreignField: 'parentId',
	options: { sort: { displayOrder: 1 } }
});

// Virtual for parent category
CategorySchema.virtual('parent', {
	ref: 'Category',
	localField: 'parentId',
	foreignField: '_id',
	justOne: true
});

// Virtual for products count
CategorySchema.virtual('productsCount', {
	ref: 'Product',
	localField: '_id',
	foreignField: 'categoryId',
	count: true
});

/**
 * Get full ancestry path
 * @returns {Promise<Array>} Array of parent categories
 */
CategorySchema.methods.getAncestry = async function() {
	const ancestry = [];
	let currentCategory = this;

	while (currentCategory.parentId) {
		const parent = await mongoose.model('Category').findById(currentCategory.parentId);
		if (!parent) break;

		ancestry.unshift(parent);
		currentCategory = parent;
	}

	return ancestry;
};

/**
 * Get all subcategories (recursive)
 * @returns {Promise<Array>} Array of subcategories
 */
CategorySchema.methods.getAllSubcategories = async function() {
	let allSubcategories = [];

	// Get direct subcategories
	const subcategories = await mongoose.model('Category')
		.find({ parentId: this._id })
		.sort({ displayOrder: 1 });

	allSubcategories = [...subcategories];

	// Recursively get nested subcategories
	for (const subcategory of subcategories) {
		const nestedSubcategories = await subcategory.getAllSubcategories();
		allSubcategories = [...allSubcategories, ...nestedSubcategories];
	}

	return allSubcategories;
};

module.exports = mongoose.model('Category', CategorySchema);