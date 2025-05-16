// src/data/repositories/product.repository.js

const { ObjectId } = require('mongodb');
const BaseRepository = require('./base.repository');
const ProductSchema = require('../schemas/product.schema');
const Product = require('../../domain/models/product.model');
const { DatabaseError } = require('../../utils/error-handler');

/**
 * @class ProductRepository
 * @extends BaseRepository
 * @description Repository for product data operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class ProductRepository extends BaseRepository {
	/**
	 * Initialize product repository
	 */
	constructor() {
		super('products', ProductSchema);
	}

	/**
	 * Find products by category ID
	 * @param {string} categoryId - Category ID
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array<Product>>} List of products in the category
	 */
	async findByCategoryId(categoryId, options = {}) {
		try {
			const query = { categoryId };

			// Handle pagination
			const limit = options.limit || 20;
			const skip = options.skip || 0;

			// Handle sorting
			const sort = options.sort || { createdAt: -1 };

			const products = await this.collection
				.find(query)
				.sort(sort)
				.skip(skip)
				.limit(limit)
				.toArray();

			return products.map(product => this._toModel(product));
		} catch (error) {
			throw new DatabaseError(`Error finding products by category: ${error.message}`);
		}
	}

	/**
	 * Count products by category ID
	 * @param {string} categoryId - Category ID
	 * @returns {Promise<number>} Count of products in the category
	 */
	async countByCategoryId(categoryId) {
		try {
			return await this.collection.countDocuments({ categoryId });
		} catch (error) {
			throw new DatabaseError(`Error counting products by category: ${error.message}`);
		}
	}

	/**
	 * Find products by availability status
	 * @param {boolean} isAvailable - Availability status
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array<Product>>} List of products with specified availability
	 */
	async findByAvailability(isAvailable, options = {}) {
		try {
			const query = { isAvailable };

			// Handle pagination
			const limit = options.limit || 20;
			const skip = options.skip || 0;

			// Handle sorting
			const sort = options.sort || { createdAt: -1 };

			const products = await this.collection
				.find(query)
				.sort(sort)
				.skip(skip)
				.limit(limit)
				.toArray();

			return products.map(product => this._toModel(product));
		} catch (error) {
			throw new DatabaseError(`Error finding products by availability: ${error.message}`);
		}
	}

	/**
	 * Find products with low stock
	 * @param {number} threshold - Stock threshold
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array<Product>>} List of products with low stock
	 */
	async findLowStock(threshold = 10, options = {}) {
		try {
			const query = { stockQuantity: { $lte: threshold } };

			// Handle pagination
			const limit = options.limit || 20;
			const skip = options.skip || 0;

			// Handle sorting
			const sort = options.sort || { stockQuantity: 1 };

			const products = await this.collection
				.find(query)
				.sort(sort)
				.skip(skip)
				.limit(limit)
				.toArray();

			return products.map(product => this._toModel(product));
		} catch (error) {
			throw new DatabaseError(`Error finding low stock products: ${error.message}`);
		}
	}

	/**
	 * Search products by name or description
	 * @param {string} query - Search query
	 * @param {Object} options - Search options (pagination, sorting)
	 * @returns {Promise<Array<Product>>} List of matching products
	 */
	async search(query, options = {}) {
		try {
			const searchQuery = {
				$or: [
					{ name: { $regex: query, $options: 'i' } },
					{ description: { $regex: query, $options: 'i' } }
				]
			};

			// Add category filter if provided
			if (options.categoryId) {
				searchQuery.categoryId = options.categoryId;
			}

			// Add availability filter if provided
			if (options.isAvailable !== undefined) {
				searchQuery.isAvailable = options.isAvailable;
			}

			// Handle pagination
			const limit = options.limit || 20;
			const skip = options.skip || 0;

			// Handle sorting
			const sort = options.sort || { name: 1 };

			const products = await this.collection
				.find(searchQuery)
				.sort(sort)
				.skip(skip)
				.limit(limit)
				.toArray();

			return products.map(product => this._toModel(product));
		} catch (error) {
			throw new DatabaseError(`Error searching products: ${error.message}`);
		}
	}

	/**
	 * Find products by IDs
	 * @param {Array<string>} ids - Product IDs
	 * @returns {Promise<Array<Product>>} List of products
	 */
	async findByIds(ids) {
		try {
			const objectIds = ids.map(id => new ObjectId(id));

			const products = await this.collection
				.find({ _id: { $in: objectIds } })
				.toArray();

			return products.map(product => this._toModel(product));
		} catch (error) {
			throw new DatabaseError(`Error finding products by IDs: ${error.message}`);
		}
	}

	/**
	 * Update product stock quantity
	 * @param {string} id - Product ID
	 * @param {number} quantity - Quantity change (positive or negative)
	 * @returns {Promise<Product>} Updated product
	 */
	async updateStock(id, quantity) {
		try {
			const result = await this.collection.findOneAndUpdate(
				{ _id: new ObjectId(id) },
				{ $inc: { stockQuantity: quantity } },
				{ returnDocument: 'after' }
			);

			if (!result) {
				throw new Error('Product not found');
			}

			return this._toModel(result);
		} catch (error) {
			throw new DatabaseError(`Error updating product stock: ${error.message}`);
		}
	}

	/**
	 * Get product stats
	 * @returns {Promise<Object>} Product statistics
	 */
	async getStats() {
		try {
			const stats = await this.collection.aggregate([
				{
					$group: {
						_id: null,
						totalProducts: { $sum: 1 },
						availableProducts: {
							$sum: { $cond: [{ $eq: ["$isAvailable", true] }, 1, 0] }
						},
						lowStockProducts: {
							$sum: { $cond: [{ $lte: ["$stockQuantity", 10] }, 1, 0] }
						},
						totalStock: { $sum: "$stockQuantity" }
					}
				}
			]).toArray();

			return stats[0] || {
				totalProducts: 0,
				availableProducts: 0,
				lowStockProducts: 0,
				totalStock: 0
			};
		} catch (error) {
			throw new DatabaseError(`Error getting product stats: ${error.message}`);
		}
	}

	/**
	 * Convert database object to domain model
	 * @param {Object} dbObject - Database object
	 * @returns {Product} Product domain model
	 * @protected
	 */
	_toModel(dbObject) {
		return new Product({
			id: dbObject._id.toString(),
			name: dbObject.name,
			description: dbObject.description,
			price: dbObject.price,
			stockQuantity: dbObject.stockQuantity,
			isAvailable: dbObject.isAvailable,
			categoryId: dbObject.categoryId,
			imageUrl: dbObject.imageUrl,
			priceOptions: dbObject.priceOptions,
			tags: dbObject.tags,
			attributes: dbObject.attributes,
			createdAt: dbObject.createdAt,
			updatedAt: dbObject.updatedAt
		});
	}

	/**
	 * Convert domain model to database object
	 * @param {Product} model - Product domain model
	 * @returns {Object} Database object
	 * @protected
	 */
	_toDbObject(model) {
		const { id, ...dbObject } = model;

		// Don't overwrite _id if it exists in model (for updates)
		if (model._id) {
			dbObject._id = model._id;
		}

		return dbObject;
	}
}

module.exports = new ProductRepository();