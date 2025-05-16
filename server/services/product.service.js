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
	async updateProduct(productId, updateData) {
		try {
			// Verify product exists
			const existingProduct = await this.productRepository.findById(productId);
			if (!existingProduct) {
				throw new Error(`Product with ID ${productId} not found`);
			}

			// If category is being updated, verify it exists
			if (updateData.categoryId && updateData.categoryId !== existingProduct.categoryId) {
				const categoryExists = await this.categoryRepository.exists({ _id: updateData.categoryId });
				if (!categoryExists) {
					throw new Error(`Category with ID ${updateData.categoryId} does not exist`);
				}
			}

			// Update timestamp
			updateData.updatedAt = new Date();

			// Update product
			const updatedProduct = await this.productRepository.update(productId, updateData);

			// Dispatch event
			this.eventDispatcher.dispatch('product:updated', {
				productId: updatedProduct.id,
				updatedFields: Object.keys(updateData),
				timestamp: new Date()
			});

			return updatedProduct;
		} catch (error) {
			this.logger.error(`Error updating product ${productId}: ${error.message}`);
			throw error;
		}
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
}

module.exports = ProductService;