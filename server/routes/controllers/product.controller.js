// src/api/controllers/product.controller.js

/**
 * @class ProductController
 * @description Controller for product-related endpoints
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */
class ProductController {
	/**
	 * Create a new ProductController instance
	 * @param {Object} productService - Product service instance
	 * @param {Object} logger - Logger instance
	 */
	constructor(productService, logger) {
		this.productService = productService;
		this.logger = logger;
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

			res.status(200).json(result);
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
					status: 'error',
					message: `Product with ID ${productId} not found`
				});
			}

			res.status(200).json({
				status: 'success',
				data: product
			});
		} catch (error) {
			this.logger.error(`Error in getProductById controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					status: 'error',
					message: error.message
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
				status: 'success',
				data: createdProduct
			});
		} catch (error) {
			this.logger.error(`Error in createProduct controller: ${error.message}`);

			if (error.message.includes('validation failed') ||
				error.message.includes('does not exist')) {
				return res.status(400).json({
					status: 'error',
					message: error.message
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
	async updateProduct(req, res, next) {
		try {
			const productId = req.params.id;
			const updateData = req.body;

			// Add image URLs if files were uploaded
			if (req.files && req.files.length > 0) {
				updateData.images = [...(updateData.images || []), ...req.files.map(file => file.path)];
			}

			const updatedProduct = await this.productService.updateProduct(productId, updateData);

			res.status(200).json({
				status: 'success',
				data: updatedProduct
			});
		} catch (error) {
			this.logger.error(`Error in updateProduct controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					status: 'error',
					message: error.message
				});
			}

			if (error.message.includes('validation failed') ||
				error.message.includes('does not exist')) {
				return res.status(400).json({
					status: 'error',
					message: error.message
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
					status: 'error',
					message: `Product with ID ${productId} not found`
				});
			}

			res.status(200).json({
				status: 'success',
				message: `Product with ID ${productId} deleted successfully`
			});
		} catch (error) {
			this.logger.error(`Error in deleteProduct controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					status: 'error',
					message: error.message
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
					status: 'error',
					message: 'Quantity is required'
				});
			}

			const updatedProduct = await this.productService.adjustStock(
				productId,
				Number(quantity)
			);

			res.status(200).json({
				status: 'success',
				data: updatedProduct
			});
		} catch (error) {
			this.logger.error(`Error in adjustStock controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					status: 'error',
					message: error.message
				});
			}

			if (error.message.includes('Insufficient stock')) {
				return res.status(400).json({
					status: 'error',
					message: error.message
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
					status: 'error',
					message: 'isAvailable flag is required'
				});
			}

			const updatedProduct = await this.productService.setAvailability(
				productId,
				Boolean(isAvailable)
			);

			res.status(200).json({
				status: 'success',
				data: updatedProduct
			});
		} catch (error) {
			this.logger.error(`Error in setAvailability controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					status: 'error',
					message: error.message
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
					status: 'error',
					message: 'Variant key and price are required'
				});
			}

			const updatedProduct = await this.productService.addVariant(
				productId,
				variantKey,
				Number(price)
			);

			res.status(200).json({
				status: 'success',
				data: updatedProduct
			});
		} catch (error) {
			this.logger.error(`Error in addVariant controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					status: 'error',
					message: error.message
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
					status: 'error',
					message: 'Variant key is required'
				});
			}

			const updatedProduct = await this.productService.removeVariant(
				productId,
				variantKey
			);

			res.status(200).json({
				status: 'success',
				data: updatedProduct
			});
		} catch (error) {
			this.logger.error(`Error in removeVariant controller: ${error.message}`);

			if (error.message.includes('not found')) {
				return res.status(404).json({
					status: 'error',
					message: error.message
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
				status: 'success',
				data: products
			});
		} catch (error) {
			this.logger.error(`Error in getLowStockProducts controller: ${error.message}`);
			next(error);
		}
	}
}

module.exports = ProductController;