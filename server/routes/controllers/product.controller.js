// src/api/controllers/product.controller.js
const ProductService = require('../../services/product.service');

/**
 * @class ProductController
 * @description Controller for product-related endpoints
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */
class ProductController {
	/**
	 * Create a new ProductController instance
	 * @param {ProductService} productService - Product service instance
	 * @param {Object} logger - Logger instance
	 */
	constructor(productService, logger) {
		this.productService = productService;
		this.logger = logger || console;
	}

	/**
	 * Get all products with filtering and pagination
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	/**
	 * OPTIMIZED CONTROLLER
	 */
	async getProducts(req, res, next) {
		try {
			// Extract query parameters with validation
			const filters = {
				categoryId: req.query.categoryId,
				search: req.query.search?.trim(),
				isAvailable: req.query.available !== undefined
					? req.query.available === 'true'
					: undefined,
				priceMin: req.query.priceMin !== undefined
					? Number(req.query.priceMin)
					: undefined,
				priceMax: req.query.priceMax !== undefined
					? Number(req.query.priceMax)
					: undefined,
				tags: req.query.tags ? req.query.tags.split(',').map(t => t.trim()) : undefined
			};

			// Parse pagination options with limits
			const options = {
				page: Math.max(1, parseInt(req.query.page, 10) || 1),
				limit: Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10)), // Cap at 100
				sort: {}
			};

			// Parse sorting
			if (req.query.sort) {
				const sortFields = req.query.sort.split(',');
				sortFields.forEach(field => {
					if (field.startsWith('-')) {
						options.sort[field.substring(1)] = -1;
					} else {
						options.sort[field] = 1;
					}
				});
			} else {
				options.sort = { createdAt: -1 };
			}

			// Get products from service
			const result = await this.productService.getProducts(filters, options);

			// Set appropriate cache headers
			res.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache
			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Products retrieved successfully.',
				responseData: result
			});
		} catch (error) {
			this.logger.error(`Error in getProducts controller: ${error.message}`);
			next(error);
		}
	}

	/**
	 * Get product by ID
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getProductById(req, res, next) {
		try {
			const productId = req.params.id;
			const product = await this.productService.getProductById(productId);

			if (!product) {
				return res.status(404).json({
					responseCode: 404,
					responseMessage: `Product with ID ${productId} not found`
				});
			}

			res.status(200).json({
				responseCode: 200,
				responseData: product,
				responseMessage: 'Product retrieved successfully.'
			});
		} catch (error) {
			this.logger.error(`Error in getProductById controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					responseCode: 404,
					responseMessage: error.message
				});
			}

			next(error);
		}
	}

	/**
	 * Create a new product
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async createProduct(req, res, next) {
		try {
			const productData = req.body;

			// Add image URLs if files were uploaded
			if (req.files && req.files.length > 0) {
				productData.images = req.files.map(file => file.path);
			}

			const createdProduct = await this.productService.createProduct(productData);

			res.status(201).json({
				responseCode: 201,
				responseData: createdProduct,
				responseMessage: 'Product created successfully.'
			});
		} catch (error) {
			this.logger.error(`Error in createProduct controller: ${error.message}`);

			if (error.message.includes('validation failed') ||
				error.message.includes('does not exist')) {
				return res.status(400).json({
					responseCode: 400,
					responseMessage: error.message
				});
			}

			next(error);
		}
	}

	/**
	 * Update an existing product
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	// Debug version of updateProduct controller method
	async updateProduct(req, res, next) {

		try {
			const productId = req.params.id;
			const updateData = { ...req.body };

			// // Parse 'images' field if it's a stringified JSON array
			// if (typeof updateData.images === 'string') {
			// 	try {
			// 		updateData.images = JSON.parse(updateData.images);
			// 	} catch (e) {
			// 		console.warn('Invalid JSON in images field:', updateData.images);
			// 		updateData.images = []; // fallback to empty array
			// 	}
			// }

			console.log('4. About to call service...');

			// Add image URLs if files were uploaded
			if (req.files && req.files.length > 0) {
				const uploadedImages = req.files.map(file => ({
					url: file.path,
					alt: updateData.name || 'Product Image',
					isDefault: false
				}));
				updateData.images = [...(updateData.images || []), ...uploadedImages];
			}
			const updatedProduct = await this.productService.updateProduct(productId, updateData);

			res.status(200).json({
				responseCode: 200,
				responseData: updatedProduct,
				responseMessage: 'Product updated successfully.'
			});

		} catch (error) {
			this.logger.error(`Error in updateProduct controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					responseCode: 404,
					responseMessage: error.message
				});
			}

			if (error.message.includes('validation failed') ||
				error.message.includes('does not exist')) {
				return res.status(400).json({
					responseCode: 400,
					responseMessage: error.message
				});
			}

			next(error);
		}
	}

	/**
	 * Delete a product
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async deleteProduct(req, res, next) {
		try {
			const productId = req.params.id;
			const result = await this.productService.deleteProduct(productId);

			if (!result) {
				return res.status(404).json({
					responseCode: 404,
					responseMessage: `Product with ID ${productId} not found`
				});
			}

			res.status(200).json({
				responseCode: 200,
				responseMessage: `Product with ID ${productId} deleted successfully`
			});
		} catch (error) {
			this.logger.error(`Error in deleteProduct controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					responseCode: 404,
					responseMessage: error.message
				});
			}

			next(error);
		}
	}

	/**
	 * Update product stock
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async adjustStock(req, res, next) {
		try {
			const productId = req.params.id;
			const { quantity } = req.body;

			if (quantity === undefined) {
				return res.status(400).json({
					responseCode: 400,
					responseMessage: 'Quantity is required'
				});
			}

			const updatedProduct = await this.productService.adjustStock(
				productId,
				Number(quantity)
			);

			res.status(200).json({
				responseCode: 200,
				responseData: updatedProduct,
				responseMessage: 'Product stock adjusted successfully.'
			});
		} catch (error) {
			this.logger.error(`Error in adjustStock controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					responseCode: 404,
					responseMessage: error.message
				});
			}

			if (error.message.includes('Insufficient stock')) {
				return res.status(400).json({
					responseCode: 400,
					responseMessage: error.message
				});
			}

			next(error);
		}
	}

	/**
	 * Toggle product availability
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async setAvailability(req, res, next) {
		try {
			const productId = req.params.id;
			const { isAvailable } = req.body;

			if (isAvailable === undefined) {
				return res.status(400).json({
					responseCode: 400,
					responseMessage: 'isAvailable flag is required'
				});
			}

			const updatedProduct = await this.productService.setAvailability(
				productId,
				Boolean(isAvailable)
			);

			res.status(200).json({
				responseCode: 200,
				responseData: updatedProduct,
				responseMessage: 'Product availability updated successfully.'
			});
		} catch (error) {
			this.logger.error(`Error in setAvailability controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					responseCode: 404,
					responseMessage: error.message
				});
			}

			next(error);
		}
	}

	/**
	 * Add product variant
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async addVariant(req, res, next) {
		try {
			const productId = req.params.id;
			const { variantKey, price } = req.body;

			if (!variantKey || price === undefined) {
				return res.status(400).json({
					responseCode: 400,
					responseMessage: 'Variant key and price are required'
				});
			}

			const updatedProduct = await this.productService.addVariant(
				productId,
				variantKey,
				Number(price)
			);

			res.status(200).json({
				responseCode: 200,
				responseData: updatedProduct,
				responseMessage: 'Product variant added successfully.'
			});
		} catch (error) {
			this.logger.error(`Error in addVariant controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					responseCode: 404,
					responseMessage: error.message
				});
			}

			next(error);
		}
	}

	/**
	 * Remove product variant
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async removeVariant(req, res, next) {
		try {
			const productId = req.params.id;
			const { variantKey } = req.params;

			if (!variantKey) {
				return res.status(400).json({
					responseCode: 400,
					responseMessage: 'Variant key is required'
				});
			}

			const updatedProduct = await this.productService.removeVariant(
				productId,
				variantKey
			);

			res.status(200).json({
				responseCode: 200,
				responseData: updatedProduct,
				responseMessage: 'Product variant removed successfully.'
			});
		} catch (error) {
			this.logger.error(`Error in removeVariant controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					responseCode: 404,
					responseMessage: error.message
				});
			}

			next(error);
		}
	}

	/**
	 * Get low stock products
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getLowStockProducts(req, res, next) {
		try {
			const threshold = req.query.threshold ? parseInt(req.query.threshold, 10) : 10;

			const products = await this.productService.getLowStockProducts(threshold);

			res.status(200).json({
				responseCode: 200,
				responseData: products,
				responseMessage: 'Low stock products retrieved successfully.'
			});
		} catch (error) {
			this.logger.error(`Error in getLowStockProducts controller: ${error.message}`);
			next(error);
		}
	}

	/**
	 * Get product statistics for dashboard
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getStats(req, res, next) {
		try {
			const filters = {
				categoryId: req.query.categoryId,
				isAvailable: req.query.available !== undefined
					? req.query.available === 'true'
					: undefined
			};

			const stats = await this.productService.getStats(filters);

			res.status(200).json({
				responseCode: 200,
				responseData: stats,
				responseMessage: 'Product statistics retrieved successfully.'
			});
		} catch (error) {
			this.logger.error(`Error in getStats controller: ${error.message}`);
			next(error);
		}
	}

	/**
	 * Get top selling products
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getTopProducts(req, res) {
		try {
			const { limit = 5, criteria = 'units', category, minRevenue, minUnits } = req.query;

			const filters = {};

			// Add category filter if provided
			if (category) {
				filters.categoryId = category;
			}

			let topProducts;

			if (criteria && criteria !== 'units') {
				topProducts = await this.productService.getTopProductsByCriteria(
					criteria,
					parseInt(limit),
					filters
				);
			} else {
				topProducts = await this.productService.getTopProducts(
					parseInt(limit),
					filters
				);
			}

			// Apply additional filters if provided
			let filteredProducts = topProducts;

			if (minRevenue) {
				filteredProducts = filteredProducts.filter(
					product => product.salesAnalytics.totalRevenue >= parseFloat(minRevenue)
				);
			}

			if (minUnits) {
				filteredProducts = filteredProducts.filter(
					product => product.salesAnalytics.totalUnitsSold >= parseInt(minUnits)
				);
			}

			res.json({
				success: true,
				message: 'Top products retrieved successfully',
				responseData: {
					products: filteredProducts,
					summary: {
						totalProducts: filteredProducts.length,
						totalRevenue: filteredProducts.reduce((sum, p) => sum + p.salesAnalytics.totalRevenue, 0),
						totalUnitsSold: filteredProducts.reduce((sum, p) => sum + p.salesAnalytics.totalUnitsSold, 0),
						totalOrders: filteredProducts.reduce((sum, p) => sum + p.salesAnalytics.orderCount, 0),
						criteria: criteria || 'units',
						dateGenerated: new Date().toISOString()
					}
				}
			});
		} catch (error) {
			console.error('Error fetching top products:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to fetch top products',
				error: error.message
			});
		}
	}

	/**
	 * Get product performance analytics
	 * GET /api/products/:id/analytics
	 */
	async getProductPerformance(req, res) {
		try {
			const { id } = req.params;
			const { startDate, endDate } = req.query;

			const dateRange = {};
			if (startDate) dateRange.startDate = startDate;
			if (endDate) dateRange.endDate = endDate;

			const performance = await this.productService.getProductPerformance(id, dateRange);

			res.json({
				success: true,
				message: 'Product performance retrieved successfully',
				responseData: {
					productId: id,
					performance,
					dateRange,
					generatedAt: new Date().toISOString()
				}
			});
		} catch (error) {
			console.error('Error fetching product performance:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to fetch product performance',
				error: error.message
			});
		}
	}

	/**
	 * Get top products by different time periods
	 * GET /api/products/analytics/top/period
	 */
	async getTopProductsByPeriod(req, res) {
		try {
			const { period = 'month', limit = 5, criteria = 'units' } = req.query;

			// Calculate date range based on period
			const now = new Date();
			let startDate;

			switch (period) {
				case 'week':
					startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					break;
				case 'month':
					startDate = new Date(now.getFullYear(), now.getMonth(), 1);
					break;
				case 'quarter':
					const quarterStart = Math.floor(now.getMonth() / 3) * 3;
					startDate = new Date(now.getFullYear(), quarterStart, 1);
					break;
				case 'year':
					startDate = new Date(now.getFullYear(), 0, 1);
					break;
				default:
					startDate = new Date(now.getFullYear(), now.getMonth(), 1);
			}

			// Add date filter to the service call
			const filters = {
				createdAt: { $gte: startDate }
			};

			const topProducts = await this.productService.getTopProductsByCriteria(
				criteria,
				parseInt(limit),
				filters
			);

			res.json({
				success: true,
				message: `Top products for ${period} retrieved successfully`,
				responseData: {
					products: topProducts,
					period: {
						type: period,
						startDate: startDate.toISOString(),
						endDate: now.toISOString()
					},
					summary: {
						totalProducts: topProducts.length,
						totalRevenue: topProducts.reduce((sum, p) => sum + p.salesAnalytics.totalRevenue, 0),
						totalUnitsSold: topProducts.reduce((sum, p) => sum + p.salesAnalytics.totalUnitsSold, 0),
						criteria
					}
				}
			});
		} catch (error) {
			console.error('Error fetching top products by period:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to fetch top products by period',
				error: error.message
			});
		}
	}

	/**
	 * Get sales comparison between products
	 * GET /api/products/analytics/compare
	 */
	async compareProducts(req, res) {
		try {
			const { productIds, startDate, endDate } = req.query;

			if (!productIds) {
				return res.status(400).json({
					success: false,
					message: 'Product IDs are required for comparison'
				});
			}

			const ids = Array.isArray(productIds) ? productIds : productIds.split(',');
			const dateRange = {};
			if (startDate) dateRange.startDate = startDate;
			if (endDate) dateRange.endDate = endDate;

			const comparisons = await Promise.all(
				ids.map(id => this.productService.getProductPerformance(id.trim(), dateRange))
			);

			// Get product details
			const products = await Promise.all(
				ids.map(id => this.productService.getProductById(id.trim()))
			);

			const comparisonData = comparisons.map((performance, index) => ({
				product: products[index],
				performance,
				productId: ids[index]
			}));

			res.json({
				success: true,
				message: 'Product comparison retrieved successfully',
				responseData: {
					comparison: comparisonData,
					summary: {
						totalProducts: comparisonData.length,
						dateRange,
						bestPerformer: {
							byRevenue: comparisonData.reduce((max, current) =>
								current.performance.totalRevenue > max.performance.totalRevenue ? current : max
							),
							byUnits: comparisonData.reduce((max, current) =>
								current.performance.totalUnitsSold > max.performance.totalUnitsSold ? current : max
							)
						}
					}
				}
			});
		} catch (error) {
			console.error('Error comparing products:', error);
			res.status(500).json({
				success: false,
				message: 'Failed to compare products',
				error: error.message
			});
		}
	}
}

// Create a default export that instantiates the controller with the correct dependencies
const productRepository = require('../../data/repositories/product.repository');
const categoryRepository = require('../../data/repositories/category.repository');
const orderRepository = require('../../data/repositories/order.repository');
const eventDispatcher = require('../../domain/events/event-dispatcher');
const logger = console;

// Create an instance of the product service
const productService = new ProductService(
	productRepository,
	categoryRepository,
	eventDispatcher,
	logger,
	orderRepository
);

// Create an instance of the product controller with the product service
const productController = new ProductController(productService, logger);

// Export the controller instance
module.exports = productController;