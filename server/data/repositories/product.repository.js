// src/data/repositories/product.repository.js

const BaseRepository = require('./base.repository');
const ProductSchema = require('../schemas/product.schema'); // This should be a Mongoose model, not schema
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
		// Make sure ProductSchema is actually a Mongoose model, not just a schema
		super(ProductSchema);
	}

	/**
	 * Find products by category ID
	 * @param {string} categoryId - Category ID
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array<Object>>} List of products in the category
	 */
	async findByCategoryId(categoryId, options = {}) {
		try {
			const filter = { categoryId };
			const queryOptions = {
				sort: options.sort || { createdAt: -1 },
				skip: options.skip || 0,
				limit: options.limit || 20,
				populate: options.populate
			};

			return await this.find(filter, queryOptions);
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
			return await this.count({ categoryId });
		} catch (error) {
			throw new DatabaseError(`Error counting products by category: ${error.message}`);
		}
	}

	/**
	 * Find products by availability status
	 * @param {boolean} isAvailable - Availability status
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array<Object>>} List of products with specified availability
	 */
	async findByAvailability(isAvailable, options = {}) {
		try {
			const filter = { isAvailable };
			const queryOptions = {
				sort: options.sort || { createdAt: -1 },
				skip: options.skip || 0,
				limit: options.limit || 20,
				populate: options.populate
			};

			return await this.find(filter, queryOptions);
		} catch (error) {
			throw new DatabaseError(`Error finding products by availability: ${error.message}`);
		}
	}

	/**
	 * Find products with low stock
	 * @param {number} threshold - Stock threshold
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Promise<Array<Object>>} List of products with low stock
	 */
	async findLowStock(threshold = 10, options = {}) {
		try {
			const filter = { stockQuantity: { $lte: threshold } };
			const queryOptions = {
				sort: options.sort || { stockQuantity: 1 },
				skip: options.skip || 0,
				limit: options.limit || 20,
				populate: options.populate
			};

			return await this.find(filter, queryOptions);
		} catch (error) {
			throw new DatabaseError(`Error finding low stock products: ${error.message}`);
		}
	}

	/**
	 * Search products by name or description
	 * @param {string} query - Search query
	 * @param {Object} options - Search options (pagination, sorting)
	 * @returns {Promise<Array<Object>>} List of matching products
	 */
	async search(query, options = {}) {
		try {
			const searchFilter = {
				$or: [
					{ name: { $regex: query, $options: 'i' } },
					{ description: { $regex: query, $options: 'i' } }
				]
			};

			// Add additional filters
			if (options.categoryId) {
				searchFilter.categoryId = options.categoryId;
			}

			if (options.isAvailable !== undefined) {
				searchFilter.isAvailable = options.isAvailable;
			}

			const queryOptions = {
				sort: options.sort || { name: 1 },
				skip: options.skip || 0,
				limit: options.limit || 20,
				populate: options.populate
			};

			return await this.find(searchFilter, queryOptions);
		} catch (error) {
			throw new DatabaseError(`Error searching products: ${error.message}`);
		}
	}

	/**
	 * Find products by IDs
	 * @param {Array<string>} ids - Product IDs
	 * @returns {Promise<Array<Object>>} List of products
	 */
	async findByIds(ids) {
		try {
			const filter = { _id: { $in: ids } };
			return await this.find(filter);
		} catch (error) {
			throw new DatabaseError(`Error finding products by IDs: ${error.message}`);
		}
	}

	/**
	 * Update product stock quantity
	 * @param {string} id - Product ID
	 * @param {number} quantity - Quantity change (positive or negative)
	 * @returns {Promise<Object>} Updated product
	 */
	async updateStock(id, quantity) {
		try {
			// Use atomic increment operation
			const updateData = {
				$inc: { stockQuantity: quantity },
				$set: { updatedAt: new Date() }
			};

			const result = await this.model.findByIdAndUpdate(
				id,
				updateData,
				{ new: true, runValidators: true }
			);

			if (!result) {
				throw new Error('Product not found');
			}

			return result.toObject ? result.toObject() : result;
		} catch (error) {
			throw new DatabaseError(`Error updating product stock: ${error.message}`);
		}
	}

	/**
	 * Get product stats using aggregation
	 * @returns {Promise<Object>} Product statistics
	 */
	async getStats() {
		try {
			const stats = await this.aggregate([
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
			]);

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
}

// Export a singleton instance
module.exports = new ProductRepository();