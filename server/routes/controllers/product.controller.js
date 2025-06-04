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
	async getProducts(req, res, next) {
		try {
			// Extract query parameters
			const filters = {
				categoryId: req.query.categoryId,
				search: req.query.search,
				isAvailable: req.query.available !== undefined
					? req.query.available === 'true'
					: undefined,
				priceMin: req.query.priceMin !== undefined
					? Number(req.query.priceMin)
					: undefined,
				priceMax: req.query.priceMax !== undefined
					? Number(req.query.priceMax)
					: undefined,
				tags: req.query.tags ? req.query.tags.split(',') : undefined
			};

			// Parse pagination options
			const options = {
				page: req.query.page ? parseInt(req.query.page, 10) : 1,
				limit: req.query.limit ? parseInt(req.query.limit, 10) : 10,
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
		console.log('=== UPDATE PRODUCT DEBUG ===');
		console.log('1. Request received:', req.params.id);
		console.log('2. Request body:', req.body);
		console.log('3. Files:', req.files);

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

			console.log('6. Calling productService.updateProduct...');
			const updatedProduct = await this.productService.updateProduct(productId, updateData);

			console.log('7. Service call completed:', updatedProduct);

			res.status(200).json({
				responseCode: 200,
				responseData: updatedProduct,
				responseMessage: 'Product updated successfully.'
			});

			console.log('8. Response sent successfully');
		} catch (error) {
			console.log('ERROR in updateProduct controller:', error);
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
	async getTopProducts(req, res, next) {
		try {
			const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
			const filters = {
				categoryId: req.query.categoryId,
				isAvailable: req.query.available !== undefined
					? req.query.available === 'true'
					: undefined
			};

			const products = await this.productService.getTopProducts(limit, filters);

			res.status(200).json({
				responseCode: 200,
				responseData: products,
				responseMessage: 'Top products retrieved successfully.'
			});
		} catch (error) {
			this.logger.error(`Error in getTopProducts controller: ${error.message}`);
			next(error);
		}
	}
}

// Create a default export that instantiates the controller with the correct dependencies
const productRepository = require('../../data/repositories/product.repository');
const categoryRepository = require('../../data/repositories/category.repository');
const eventDispatcher = require('../../domain/events/event-dispatcher');
const logger = console;

// Create an instance of the product service
const productService = new ProductService(
	productRepository,
	categoryRepository,
	eventDispatcher,
	logger
);

// Create an instance of the product controller with the product service
const productController = new ProductController(productService, logger);

// Export the controller instance
module.exports = productController;