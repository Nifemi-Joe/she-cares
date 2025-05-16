// src/domain/models/product.model.js

/**
 * @class Product
 * @description Product domain model representing various inventory items
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */
class Product {
	/**
	 * Create a new Product instance
	 * @param {Object} productData - Product information
	 * @param {string} productData.id - Unique identifier
	 * @param {string} productData.name - Product name
	 * @param {string} productData.description - Product description
	 * @param {string} productData.categoryId - Reference to category
	 * @param {Array<string>} productData.images - Array of image URLs
	 * @param {number} productData.price - Base price of the product
	 * @param {string} productData.unit - Unit of measurement (e.g., "basket", "kg", "piece")
	 * @param {Object} productData.variants - Different variants of the product with prices
	 * @param {number} productData.stockQuantity - Available quantity
	 * @param {boolean} productData.isAvailable - Whether product is available
	 * @param {Array<string>} productData.tags - Descriptive tags
	 * @param {Date} productData.createdAt - Creation timestamp
	 * @param {Date} productData.updatedAt - Last update timestamp
	 */
	constructor({
		            id,
		            name,
		            description,
		            categoryId,
		            images = [],
		            price,
		            unit,
		            variants = {},
		            stockQuantity,
		            isAvailable = true,
		            tags = [],
		            createdAt = new Date(),
		            updatedAt = new Date()
	            }) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.categoryId = categoryId;
		this.images = images;
		this.price = price;
		this.unit = unit;
		this.variants = variants;
		this.stockQuantity = stockQuantity;
		this.isAvailable = isAvailable;
		this.tags = tags;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	/**
	 * Check if product is in stock
	 * @param {number} quantity - Quantity to check
	 * @returns {boolean} - Whether requested quantity is available
	 */
	isInStock(quantity = 1) {
		return this.stockQuantity >= quantity && this.isAvailable;
	}

	/**
	 * Calculate price for specific variant and quantity
	 * @param {string} variantKey - Variant identifier
	 * @param {number} quantity - Quantity ordered
	 * @returns {number} - Total price
	 */
	calculatePrice(variantKey = null, quantity = 1) {
		if (variantKey && this.variants[variantKey]) {
			return this.variants[variantKey] * quantity;
		}
		return this.price * quantity;
	}

	/**
	 * Adjust stock level after purchase or inventory update
	 * @param {number} quantity - Quantity to reduce (positive) or add (negative)
	 * @throws {Error} If insufficient stock
	 */
	adjustStock(quantity) {
		const newQuantity = this.stockQuantity - quantity;
		if (newQuantity < 0) {
			throw new Error('Insufficient stock available');
		}
		this.stockQuantity = newQuantity;
		this.updatedAt = new Date();

		// Check if stock is getting low
		if (this.stockQuantity <= 10) {
			return {
				event: 'LOW_STOCK',
				productId: this.id,
				remainingStock: this.stockQuantity
			};
		}

		return null;
	}

	/**
	 * Toggle product availability
	 * @param {boolean} isAvailable - New availability status
	 */
	setAvailability(isAvailable) {
		this.isAvailable = isAvailable;
		this.updatedAt = new Date();
	}

	/**
	 * Add a product variant with custom price
	 * @param {string} variantKey - Variant name/key
	 * @param {number} price - Price for this variant
	 */
	addVariant(variantKey, price) {
		this.variants[variantKey] = price;
		this.updatedAt = new Date();
	}

	/**
	 * Remove a product variant
	 * @param {string} variantKey - Variant to remove
	 */
	removeVariant(variantKey) {
		if (this.variants[variantKey]) {
			delete this.variants[variantKey];
			this.updatedAt = new Date();
		}
	}

	/**
	 * Convert to plain object for serialization
	 * @returns {Object} Plain JavaScript object
	 */
	toJSON() {
		return {
			id: this.id,
			name: this.name,
			description: this.description,
			categoryId: this.categoryId,
			images: this.images,
			price: this.price,
			unit: this.unit,
			variants: this.variants,
			stockQuantity: this.stockQuantity,
			isAvailable: this.isAvailable,
			tags: this.tags,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		};
	}
}

module.exports = Product;