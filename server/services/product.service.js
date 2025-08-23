// src/services/product.service.js

/**
 * @class ProductService
 * @description Service layer for product operations with fixed search functionality
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
	 * @param orderRepository
	 */
	constructor(productRepository, categoryRepository, eventDispatcher, logger, orderRepository) {
		this.productRepository = productRepository;
		this.categoryRepository = categoryRepository;
		this.orderRepository = orderRepository;
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
	 * Get all products with filtering and pagination - FIXED SEARCH
	 * @param {Object} filters - Filter criteria
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Paginated products
	 * @throws {Error} Database error
	 */
	async getProducts(filters = {}, options = {}) {
		try {
			// Build optimized filter object
			const filterQuery = await this._buildFilterQuery(filters);

			// Set up optimized query options
			const queryOptions = {
				sort: options.sort || { createdAt: -1 },
				skip: options.page > 0 ? (options.page - 1) * (options.limit || 10) : 0,
				limit: options.limit || 10,
				populate: {
					path: 'categoryId',
					select: 'name slug id' // Only select needed fields
				},
				lean: true // Return plain JavaScript objects instead of Mongoose documents
			};

			// Use aggregation for complex queries or fall back to find
			const useAggregation = this._shouldUseAggregation(filters);

			if (useAggregation) {
				return await this._getProductsWithAggregation(filterQuery, queryOptions, options);
			} else {
				return await this._getProductsWithFind(filterQuery, queryOptions, options);
			}
		} catch (error) {
			this.logger.error(`Error fetching products: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Build optimized filter query - FIXED SEARCH LOGIC
	 */
	async _buildFilterQuery(filters) {
		const filterQuery = {};

		if (filters.categoryId) {
			filterQuery.categoryId = filters.categoryId;
		}

		if (filters.isAvailable !== undefined) {
			filterQuery.isAvailable = filters.isAvailable;
		}

		// FIXED: Implement proper search with fallback mechanism
		if (filters.search && filters.search.trim()) {
			const searchTerm = filters.search.trim();

			// First, try to check if text index exists
			try {
				// Check if we can use text search
				const hasTextIndex = await this._checkTextIndex();

				if (hasTextIndex) {
					// Use text index if available
					filterQuery.$text = { $search: searchTerm };
				} else {
					// Fallback to regex search
					filterQuery.$or = [
						{ name: { $regex: searchTerm, $options: 'i' } },
						{ description: { $regex: searchTerm, $options: 'i' } }
					];
				}
			} catch (textSearchError) {
				// If text search fails, use regex fallback
				this.logger.warn('Text search failed, using regex fallback:', textSearchError.message);
				filterQuery.$or = [
					{ name: { $regex: searchTerm, $options: 'i' } },
					{ description: { $regex: searchTerm, $options: 'i' } }
				];
			}
		}

		// Optimized price range query
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

		return filterQuery;
	}

	/**
	 * Check if text index exists on the collection
	 */
	async _checkTextIndex() {
		try {
			// Try to get indexes from the collection
			const indexes = await this.productRepository.collection.indexes();
			return indexes.some(index =>
				index.textIndexVersion !== undefined ||
				Object.values(index.key || {}).includes('text')
			);
		} catch (error) {
			this.logger.warn('Could not check text index:', error.message);
			return false;
		}
	}

	/**
	 * Get only necessary fields to reduce data transfer
	 */
	_getSelectFields() {
		return 'name description price isAvailable categoryId tags createdAt images slug stockQuantity';
	}

	/**
	 * Determine if aggregation pipeline should be used
	 */
	_shouldUseAggregation(filters) {
		// Use aggregation for complex queries like search scoring or multiple tag filtering
		return (filters.search && filters.search.includes(' ')) || (filters.tags && filters.tags.length > 1);
	}

	/**
	 * Get products using aggregation pipeline (for complex queries) - FIXED
	 */
	async _getProductsWithAggregation(filterQuery, queryOptions, options) {
		try {
			const pipeline = [
				{ $match: filterQuery },
				{
					$lookup: {
						from: 'categories',
						localField: 'categoryId',
						foreignField: '_id',
						as: 'categoryId',
						pipeline: [{ $project: { name: 1, slug: 1 } }]
					}
				},
				{ $unwind: { path: '$categoryId', preserveNullAndEmptyArrays: true } },
				// { $project: this._getProjectionFields() }
			];

			// Add text score for sorting if using text search
			if (filterQuery.$text) {
				pipeline[3].$project.score = { $meta: 'textScore' };
				pipeline.push({ $sort: { score: { $meta: 'textScore' }, ...queryOptions.sort } });
			} else {
				pipeline.push({ $sort: queryOptions.sort });
			}

			// Add pagination with count
			pipeline.push({
				$facet: {
					data: [
						{ $skip: queryOptions.skip },
						{ $limit: queryOptions.limit }
					],
					count: [{ $count: 'total' }]
				}
			});

			const [result] = await this.productRepository.aggregate(pipeline);
			const total = result.count[0]?.total || 0;

			return {
				data: result.data,
				pagination: {
					total,
					page: options.page || 1,
					limit: options.limit || 10,
					pages: Math.ceil(total / (options.limit || 10))
				}
			};
		} catch (error) {
			this.logger.error('Aggregation query failed:', error.message);
			// Fallback to simple find
			return await this._getProductsWithFind(filterQuery, queryOptions, options);
		}
	}

	/**
	 * Get products using find (for simple queries) - FIXED
	 */
	async _getProductsWithFind(filterQuery, queryOptions, options) {
		try {
			// Add select fields to query options
			const findOptions = {
				...queryOptions,
			};

			// For simple queries, use separate count query
			const [products, total] = await Promise.all([
				this.productRepository.find(filterQuery, findOptions),
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
			this.logger.error('Find query failed:', error.message);
			throw error;
		}
	}

	/**
	 * Get projection fields for aggregation
	 */
	_getProjectionFields() {
		return {
			name: 1,
			description: 1,
			price: 1,
			isAvailable: 1,
			categoryId: 1,
			tags: 1,
			createdAt: 1,
			images: 1,
			slug: 1,
			stockQuantity: 1
		};
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
			// First, get sales data from orders using aggregation
			const salesAnalytics = await this.orderRepository.aggregate([
				// Match completed orders only
				{
					$match: {
						status: { $in: ['delivered', 'completed'] },
						// paymentStatus: { $in: ['paid', 'partially_paid'] }
					}
				},
				// Unwind items array to work with individual products
				{ $unwind: '$items' },
				// Group by product to calculate sales metrics
				{
					$group: {
						_id: '$items.productId',
						totalUnitsSold: { $sum: '$items.quantity' },
						totalRevenue: { $sum: '$items.totalPrice' },
						orderCount: { $sum: 1 },
						avgOrderValue: { $avg: '$items.totalPrice' },
						lastSaleDate: { $max: '$createdAt' }
					}
				},
				// Sort by total units sold (descending)
				{ $sort: { totalUnitsSold: -1 } },
				// Limit results
				{ $limit: limit * 2 } // Get more than needed to filter available products
			]);

			// Extract product IDs from sales data
			const productIds = salesAnalytics.map(item => item._id);

			// Build filter query for products
			const productFilter = {
				_id: { $in: productIds },
				isAvailable: true,
				...filters
			};

			// Get product details
			const products = await this.productRepository.find(productFilter, {
				populate: 'categoryId'
			});

			// Combine product data with sales analytics
			const topProducts = products
				.map(product => {
					const salesData = salesAnalytics.find(
						item => item._id.toString() === product._id.toString()
					);

					return {
						...product,
						salesAnalytics: {
							totalUnitsSold: salesData?.totalUnitsSold || 0,
							totalRevenue: salesData?.totalRevenue || 0,
							orderCount: salesData?.orderCount || 0,
							avgOrderValue: salesData?.avgOrderValue || 0,
							lastSaleDate: salesData?.lastSaleDate || null,
							// Calculate additional metrics
							revenuePerUnit: salesData?.totalRevenue && salesData?.totalUnitsSold
								? Number((salesData.totalRevenue / salesData.totalUnitsSold).toFixed(2))
								: 0,
							salesRank: null // Will be set below
						}
					};
				})
				.sort((a, b) => b.salesAnalytics.totalUnitsSold - a.salesAnalytics.totalUnitsSold)
				.slice(0, limit)
				.map((product, index) => ({
					...product,
					salesAnalytics: {
						...product.salesAnalytics,
						salesRank: index + 1
					}
				}));

			return topProducts;
		} catch (error) {
			this.logger.error(`Error fetching top products: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get top products by different criteria
	 * @param {string} criteria - 'revenue', 'units', 'orders'
	 * @param {number} limit - Number of products to return
	 * @param {Object} filters - Additional filters
	 * @returns {Array} Top products sorted by criteria
	 */
	async getTopProductsByCriteria(criteria = 'units', limit = 5, filters = {}) {
		try {
			let sortField;
			switch (criteria) {
				case 'revenue':
					sortField = { totalRevenue: -1 };
					break;
				case 'orders':
					sortField = { orderCount: -1 };
					break;
				default:
					sortField = { totalUnitsSold: -1 };
			}

			const salesAnalytics = await this.orderRepository.aggregate([
				{
					$match: {
						status: { $in: ['delivered', 'completed'] },
						paymentStatus: { $in: ['paid', 'partially_paid'] }
					}
				},
				{ $unwind: '$items' },
				{
					$group: {
						_id: '$items.productId',
						totalUnitsSold: { $sum: '$items.quantity' },
						totalRevenue: { $sum: '$items.totalPrice' },
						orderCount: { $sum: 1 },
						avgOrderValue: { $avg: '$items.totalPrice' },
						lastSaleDate: { $max: '$createdAt' }
					}
				},
				{ $sort: sortField },
				{ $limit: limit * 2 }
			]);

			const productIds = salesAnalytics.map(item => item._id);
			const productFilter = {
				_id: { $in: productIds },
				isAvailable: true,
				...filters
			};

			const products = await this.productRepository.find(productFilter, {
				populate: 'categoryId'
			});

			const topProducts = products
				.map(product => {
					const salesData = salesAnalytics.find(
						item => item._id.toString() === product._id.toString()
					);

					return {
						...product.toObject(),
						salesAnalytics: {
							totalUnitsSold: salesData?.totalUnitsSold || 0,
							totalRevenue: salesData?.totalRevenue || 0,
							orderCount: salesData?.orderCount || 0,
							avgOrderValue: salesData?.avgOrderValue || 0,
							lastSaleDate: salesData?.lastSaleDate || null,
							revenuePerUnit: salesData?.totalRevenue && salesData?.totalUnitsSold
								? Number((salesData.totalRevenue / salesData.totalUnitsSold).toFixed(2))
								: 0
						}
					};
				})
				.sort((a, b) => {
					switch (criteria) {
						case 'revenue':
							return b.salesAnalytics.totalRevenue - a.salesAnalytics.totalRevenue;
						case 'orders':
							return b.salesAnalytics.orderCount - a.salesAnalytics.orderCount;
						default:
							return b.salesAnalytics.totalUnitsSold - a.salesAnalytics.totalUnitsSold;
					}
				})
				.slice(0, limit)
				.map((product, index) => ({
					...product,
					salesAnalytics: {
						...product.salesAnalytics,
						salesRank: index + 1
					}
				}));

			return topProducts;
		} catch (error) {
			this.logger.error(`Error fetching top products by ${criteria}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get product performance analytics for a specific product
	 * @param {string} productId - Product ID
	 * @param {Object} dateRange - Date range filter
	 * @returns {Object} Product performance data
	 */
	async getProductPerformance(productId, dateRange = {}) {
		try {
			const matchFilter = {
				'items.productId': new mongoose.Types.ObjectId(productId),
				status: { $in: ['delivered', 'completed'] },
				paymentStatus: { $in: ['paid', 'partially_paid'] }
			};

			// Add date range filter if provided
			if (dateRange.startDate || dateRange.endDate) {
				matchFilter.createdAt = {};
				if (dateRange.startDate) {
					matchFilter.createdAt.$gte = new Date(dateRange.startDate);
				}
				if (dateRange.endDate) {
					matchFilter.createdAt.$lte = new Date(dateRange.endDate);
				}
			}

			const performance = await this.orderRepository.aggregate([
				{ $match: matchFilter },
				{ $unwind: '$items' },
				{
					$match: {
						'items.productId': new mongoose.Types.ObjectId(productId)
					}
				},
				{
					$group: {
						_id: null,
						totalUnitsSold: { $sum: '$items.quantity' },
						totalRevenue: { $sum: '$items.totalPrice' },
						orderCount: { $sum: 1 },
						avgOrderValue: { $avg: '$items.totalPrice' },
						avgUnitsPerOrder: { $avg: '$items.quantity' },
						firstSaleDate: { $min: '$createdAt' },
						lastSaleDate: { $max: '$createdAt' },
						minPrice: { $min: '$items.price' },
						maxPrice: { $max: '$items.price' },
						avgPrice: { $avg: '$items.price' }
					}
				}
			]);

			// Get monthly sales trend
			const monthlySales = await this.orderRepository.aggregate([
				{ $match: matchFilter },
				{ $unwind: '$items' },
				{
					$match: {
						'items.productId': new mongoose.Types.ObjectId(productId)
					}
				},
				{
					$group: {
						_id: {
							year: { $year: '$createdAt' },
							month: { $month: '$createdAt' }
						},
						units: { $sum: '$items.quantity' },
						revenue: { $sum: '$items.totalPrice' },
						orders: { $sum: 1 }
					}
				},
				{ $sort: { '_id.year': 1, '_id.month': 1 } }
			]);

			const result = performance[0] || {
				totalUnitsSold: 0,
				totalRevenue: 0,
				orderCount: 0,
				avgOrderValue: 0,
				avgUnitsPerOrder: 0,
				firstSaleDate: null,
				lastSaleDate: null,
				minPrice: 0,
				maxPrice: 0,
				avgPrice: 0
			};

			return {
				...result,
				revenuePerUnit: result.totalUnitsSold > 0
					? Number((result.totalRevenue / result.totalUnitsSold).toFixed(2))
					: 0,
				monthlySales: monthlySales.map(item => ({
					year: item._id.year,
					month: item._id.month,
					monthName: new Date(item._id.year, item._id.month - 1).toLocaleDateString('en-US', { month: 'long' }),
					units: item.units,
					revenue: item.revenue,
					orders: item.orders
				}))
			};
		} catch (error) {
			this.logger.error(`Error fetching product performance for ${productId}: ${error.message}`);
			throw error;
		}
	}
	/**
	 * Create text index for better search performance
	 * Call this method during application initialization
	 */
	async createTextIndex() {
		try {
			await this.productRepository.collection.createIndex({
				name: 'text',
				description: 'text'
			}, {
				weights: {
					name: 10,
					description: 5
				},
				name: 'product_text_index'
			});
			this.logger.info('Text index created successfully');
		} catch (error) {
			if (error.code === 85) { // Index already exists
				this.logger.info('Text index already exists');
			} else {
				this.logger.error('Failed to create text index:', error.message);
			}
		}
	}
}

module.exports = ProductService;