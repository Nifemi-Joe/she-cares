// src/services/product.service.js

/**
 * @class ProductService
 * @description Service layer for product operations
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */
class ProductService {
	/**
	 * Create a new ProductService instance
	 * @param {Object} productRepository - Product repository instance
	 * @param {Object} categoryRepository - Category repository for validation
	 * @param {Object} eventDispatcher - Event dispatcher for domain events
	 * @param {Object} logger - Logger instance
	 */
	constructor(productRepository, categoryRepository, eventDispatcher, logger) {
		this.productRepository = productRepository;
		this.categoryRepository = categoryRepository;
		this.eventDispatcher = eventDispatcher;
		this.logger = logger;
	}

	/**
	 * Create a new product
	 * @param {Object} productData - Product data
	 * @returns {Promise<Object>} Created product
	 * @throws {Error} Validation or database error
	 */
	async createProduct(productData) {
		try {
			// Check if category exists
			const categoryExists = await this.categoryRepository.exists({ _id: productData.categoryId });
			if (!categoryExists) {
				throw new Error(`Category with ID ${productData.categoryId} does not exist`);
			}

			// Create product ID if not provided
			if (!productData.id) {
				productData.id = `prod_${Date.now()}`;
			}

			// Create product domain model
			const Product = require('../domain/models/product.model');
			const product = new Product(productData);

			// Save to database
			const savedProduct = await this.productRepository.create(product.toJSON());

			// Dispatch event
			this.eventDispatcher.dispatch('product:created', {
				productId: savedProduct.id,
				categoryId: savedProduct.categoryId,
				timestamp: new Date()
			});

			return savedProduct;
		} catch (error) {
			this.logger.error(`Error creating product: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get product by ID
	 * @param {string} productId - Product ID
	 * @returns {Promise<Object>} Product data
	 * @throws {Error} Not found or database error
	 */
	async getProductById(productId) {
		try {
			const product = await this.productRepository.findById(productId, {
				populate: 'categoryId'
			});

			if (!product) {
				throw new Error(`Product with ID ${productId} not found`);
			}

			return product;
		} catch (error) {
			this.logger.error(`Error fetching product ${productId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get all products with filtering and pagination
	 * @param {Object} filters - Filter criteria
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Paginated products
	 * @throws {Error} Database error
	 */
	async getProducts(filters = {}, options = {}) {
		try {
			// Build filter object
			const filterQuery = {};

			if (filters.categoryId) {
				filterQuery.categoryId = filters.categoryId;
			}

			if (filters.isAvailable !== undefined) {
				filterQuery.isAvailable = filters.isAvailable;
			}

			if (filters.search) {
				filterQuery.$or = [
					{ name: { $regex: filters.search, $options: 'i' } },
					{ description: { $regex: filters.search, $options: 'i' } },
					{ tags: { $regex: filters.search, $options: 'i' } }
				];
			}

			if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
				filterQuery.price = {};
				if (filters.priceMin !== undefined) {
					filterQuery.price.$gte = filters.priceMin;
				}
				if (filters.priceMax !== undefined) {
					filterQuery.price.$lte = filters.priceMax;
				}
			}

			if (filters.tags && Array.isArray(filters.tags)) {
				filterQuery.tags = { $in: filters.tags };
			}

			// Set up pagination options
			const queryOptions = {
				sort: options.sort || { createdAt: -1 },
				skip: options.page > 0 ? (options.page - 1) * (options.limit || 10) : 0,
				limit: options.limit || 10,
				populate: 'categoryId'
			};

			// Get data
			const [products, total] = await Promise.all([
				this.productRepository.find(filterQuery, queryOptions),
				this.productRepository.count(filterQuery)
			]);

			return {
				data: products,
				pagination: {
					total,
					page: options.page || 1,
					limit: options.limit || 10,
					pages: Math.ceil(total / (options.limit || 10))
				}
			};
		} catch (error) {
			this.logger.error(`Error fetching products: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Update a product
	 * @param {string} productId - Product ID
	 * @param {Object} updateData - Updated product data
	 * @returns {Promise<Object>} Updated product
	 * @throws {Error} Not found or database error
	 */
	// Fixed updateProduct method for ProductService

	/**
	 * Update a product
	 * @param {string} productId - Product ID
	 * @param {Object} updateData - Updated product data
	 * @returns {Promise<Object>} Updated product
	 * @throws {Error} Not found or database error
	 */
	async updateProduct(productId, updateData) {
		try {
			// Add request timeout to prevent hanging
			const TIMEOUT = 30000; // 30 seconds

			const updatePromise = this._performUpdate(productId, updateData);
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Update operation timed out')), TIMEOUT);
			});

			return await Promise.race([updatePromise, timeoutPromise]);
		} catch (error) {
			this.logger.error(`Error updating product ${productId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Internal method to perform the actual update
	 * @private
	 */
	async _performUpdate(productId, updateData) {
		// Step 1: Verify product exists first
		this.logger.info(`Starting update for product: ${productId}`);

		const existingProduct = await this.productRepository.findById(productId);
		if (!existingProduct) {
			throw new Error(`Product with ID ${productId} not found`);
		}

		this.logger.info(`Product found, proceeding with update`);

		// Step 2: Validate category if being updated
		if (updateData.categoryId && updateData.categoryId !== existingProduct.categoryId) {
			this.logger.info(`Validating new category: ${updateData.categoryId}`);

			const categoryExists = await this.categoryRepository.exists({ _id: updateData.categoryId });
			if (!categoryExists) {
				throw new Error(`Category with ID ${updateData.categoryId} does not exist`);
			}
		}

		// Step 3: Prepare update data
		const updatePayload = {
			...updateData,
			updatedAt: new Date()
		};

		// Remove undefined values to prevent overwriting with null
		Object.keys(updatePayload).forEach(key => {
			if (updatePayload[key] === undefined) {
				delete updatePayload[key];
			}
		});

		this.logger.info(`Updating product with payload:`, Object.keys(updatePayload));

		// Step 4: Perform the update
		const updatedProduct = await this.productRepository.update(productId, updatePayload);

		if (!updatedProduct) {
			throw new Error(`Failed to update product with ID ${productId}`);
		}

		this.logger.info(`Product updated successfully: ${productId}`);

		// Step 5: Dispatch event (non-blocking)
		try {
			this.eventDispatcher.dispatch('product:updated', {
				productId: updatedProduct.id || updatedProduct._id,
				updatedFields: Object.keys(updateData),
				timestamp: new Date()
			});
		} catch (eventError) {
			// Log but don't fail the update
			this.logger.warn(`Failed to dispatch update event: ${eventError.message}`);
		}

		return updatedProduct;
	}

	/**
	 * Delete a product
	 * @param {string} productId - Product ID
	 * @returns {Promise<boolean>} Success indicator
	 * @throws {Error} Not found or database error
	 */
	async deleteProduct(productId) {
		try {
			// Check if product exists
			const product = await this.productRepository.findById(productId);
			if (!product) {
				throw new Error(`Product with ID ${productId} not found`);
			}

			// Perform deletion
			const result = await this.productRepository.delete(productId);

			// Dispatch event if successful
			if (result) {
				this.eventDispatcher.dispatch('product:deleted', {
					productId: productId,
					timestamp: new Date()
				});
			}

			return result;
		} catch (error) {
			this.logger.error(`Error deleting product ${productId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Update product stock quantity
	 * @param {string} productId - Product ID
	 * @param {number} quantity - Quantity change (positive to reduce, negative to add)
	 * @returns {Promise<Object>} Updated product
	 * @throws {Error} Insufficient stock or database error
	 */
	async adjustStock(productId, quantity) {
		try {
			return await this.productRepository.withTransaction(async (session) => {
				// Get product with lock for update
				const product = await this.productRepository.findOne(
					{ _id: productId },
					{ session }
				);

				if (!product) {
					throw new Error(`Product with ID ${productId} not found`);
				}

				// Create domain model to apply business logic
				const Product = require('../domain/models/product.model');
				const productModel = new Product(product);

				// Adjust stock (throws error if insufficient)
				const event = productModel.adjustStock(quantity);

				// Update in database
				const updatedProduct = await this.productRepository.update(
					productId,
					{
						stockQuantity: productModel.stockQuantity,
						updatedAt: productModel.updatedAt
					},
					{ session }
				);

				// Dispatch event if stock is low
				if (event) {
					this.eventDispatcher.dispatch('product:low-stock', event);
				}

				return updatedProduct;
			});
		} catch (error) {
			this.logger.error(`Error adjusting stock for product ${productId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Toggle product availability
	 * @param {string} productId - Product ID
	 * @param {boolean} isAvailable - Availability status
	 * @returns {Promise<Object>} Updated product
	 * @throws {Error} Not found or database error
	 */
	async setAvailability(productId, isAvailable) {
		try {
			const product = await this.productRepository.findById(productId);

			if (!product) {
				throw new Error(`Product with ID ${productId} not found`);
			}

			// Create domain model
			const Product = require('../domain/models/product.model');
			const productModel = new Product(product);

			// Update availability
			productModel.setAvailability(isAvailable);

			// Save changes
			const updatedProduct = await this.productRepository.update(productId, {
				isAvailable: productModel.isAvailable,
				updatedAt: productModel.updatedAt
			});

			// Dispatch event
			this.eventDispatcher.dispatch('product:availability-changed', {
				productId: productId,
				isAvailable: isAvailable,
				timestamp: new Date()
			});

			return updatedProduct;
		} catch (error) {
			this.logger.error(`Error updating availability for product ${productId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Add product variant
	 * @param {string} productId - Product ID
	 * @param {string} variantKey - Variant key/name
	 * @param {number} price - Variant price
	 * @returns {Promise<Object>} Updated product
	 * @throws {Error} Not found or database error
	 */
	async addVariant(productId, variantKey, price) {
		try {
			const product = await this.productRepository.findById(productId);

			if (!product) {
				throw new Error(`Product with ID ${productId} not found`);
			}

			// Create domain model
			const Product = require('../domain/models/product.model');
			const productModel = new Product(product);

			// Add variant
			productModel.addVariant(variantKey, price);

			// Save changes
			const updatedProduct = await this.productRepository.update(productId, {
				variants: productModel.variants,
				updatedAt: productModel.updatedAt
			});

			return updatedProduct;
		} catch (error) {
			this.logger.error(`Error adding variant to product ${productId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Remove product variant
	 * @param {string} productId - Product ID
	 * @param {string} variantKey - Variant key/name
	 * @returns {Promise<Object>} Updated product
	 * @throws {Error} Not found or database error
	 */
	async removeVariant(productId, variantKey) {
		try {
			const product = await this.productRepository.findById(productId);

			if (!product) {
				throw new Error(`Product with ID ${productId} not found`);
			}

			// Create domain model
			const Product = require('../domain/models/product.model');
			const productModel = new Product(product);

			// Remove variant
			productModel.removeVariant(variantKey);

			// Save changes
			const updatedProduct = await this.productRepository.update(productId, {
				variants: productModel.variants,
				updatedAt: productModel.updatedAt
			});

			return updatedProduct;
		} catch (error) {
			this.logger.error(`Error removing variant from product ${productId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get products that are low in stock
	 * @param {number} threshold - Stock threshold
	 * @returns {Promise<Array<Object>>} Low stock products
	 * @throws {Error} Database error
	 */
	async getLowStockProducts(threshold = 10) {
		try {
			return await this.productRepository.find(
				{
					stockQuantity: { $lte: threshold },
					isAvailable: true
				},
				{
					sort: { stockQuantity: 1 },
					populate: 'categoryId'
				}
			);
		} catch (error) {
			this.logger.error(`Error fetching low stock products: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get product statistics for dashboard
	 * @param {Object} filters - Optional filter criteria
	 * @returns {Promise<Object>} Product statistics
	 * @throws {Error} Database error
	 */
	async getStats(filters = {}) {
		try {
			// Build filter query
			const filterQuery = {};

			if (filters.categoryId) {
				filterQuery.categoryId = filters.categoryId;
			}

			if (filters.isAvailable !== undefined) {
				filterQuery.isAvailable = filters.isAvailable;
			}

			// Get basic counts
			const [
				totalProducts,
				availableProducts,
				unavailableProducts,
				lowStockProducts,
				outOfStockProducts
			] = await Promise.all([
				this.productRepository.count(filterQuery),
				this.productRepository.count({ ...filterQuery, isAvailable: true }),
				this.productRepository.count({ ...filterQuery, isAvailable: false }),
				this.productRepository.count({
					...filterQuery,
					stockQuantity: { $lte: 10 },
					isAvailable: true
				}),
				this.productRepository.count({
					...filterQuery,
					stockQuantity: { $lte: 0 }
				})
			]);

			// Get inventory value and stock statistics
			const inventoryStats = await this.productRepository.aggregate([
				{ $match: filterQuery },
				{ $group: {
						_id: null,
						totalInventoryValue: { $sum: { $multiply: ['$price', '$stockQuantity'] } },
						totalStockQuantity: { $sum: '$stockQuantity' },
						avgPrice: { $avg: '$price' },
						minPrice: { $min: '$price' },
						maxPrice: { $max: '$price' },
						avgStockQuantity: { $avg: '$stockQuantity' }
					}}
			]);

			// Get category breakdown
			const categoryBreakdown = await this.productRepository.aggregate([
				{ $match: filterQuery },
				{ $lookup: {
						from: 'categories',
						localField: 'categoryId',
						foreignField: '_id',
						as: 'category'
					}},
				{ $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
				{ $group: {
						_id: '$category.name',
						count: { $sum: 1 },
						totalValue: { $sum: { $multiply: ['$price', '$stockQuantity'] } }
					}},
				{ $sort: { count: -1 } }
			]);

			const stats = inventoryStats[0] || {
				totalInventoryValue: 0,
				totalStockQuantity: 0,
				avgPrice: 0,
				minPrice: 0,
				maxPrice: 0,
				avgStockQuantity: 0
			};

			return {
				totalProducts,
				availableProducts,
				unavailableProducts,
				lowStockProducts,
				outOfStockProducts,
				...stats,
				categoryBreakdown: categoryBreakdown.reduce((acc, curr) => {
					acc[curr._id || 'Uncategorized'] = {
						count: curr.count,
						totalValue: curr.totalValue
					};
					return acc;
				}, {})
			};
		} catch (error) {
			this.logger.error(`Error calculating product statistics: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get top selling products
	 * @param {number} limit - Number of products to return
	 * @param {Object} filters - Optional filter criteria
	 * @returns {Promise<Array>} Top products
	 * @throws {Error} Database error
	 */
	async getTopProducts(limit = 5, filters = {}) {
		try {
			// This would typically require order data to determine top selling
			// For now, we'll return products by stock quantity (most stocked = popular)
			const filterQuery = { isAvailable: true, ...filters };

			return await this.productRepository.find(filterQuery, {
				sort: { stockQuantity: -1 },
				limit: limit,
				populate: 'categoryId'
			});
		} catch (error) {
			this.logger.error(`Error fetching top products: ${error.message}`);
			throw error;
		}
	}
}

module.exports = ProductService;