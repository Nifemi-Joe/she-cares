// src/api/controllers/category.controller.js

const categoryService = require('../../services/category.service');
const { ValidationError } = require('../../utils/error-handler');

/**
 * @class CategoryController
 * @description Controller handling category-related requests
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class CategoryController {
	/**
	 * Create a new category
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async createCategory(req, res, next) {
		try {
			const categoryData = req.body;
			if (!categoryData.name) {
				throw new ValidationError('Category name is required');
			}

			const category = await categoryService.createCategory(categoryData);

			res.status(201).json({
				responseCode: true,
				responseData: category,
				responseMessage: 'Category created successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get all categories
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getAllCategories(req, res, next) {
		try {
			const { sort = 'name', order = 'asc' } = req.query;

			const options = {
				sort,
				order
			};

			const categories = await categoryService.getAllCategories(options);

			res.status(200).json({
				responseCode: 200,
				responseData: categories,
				responseMessage: 'Categories retrieved successfully.'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get category by ID
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getCategoryById(req, res, next) {
		try {
			const { categoryId } = req.params;
			const category = await categoryService.getCategoryById(categoryId);

			res.status(200).json({
				responseCode: 200,
				responseData: category,
				responseMessage: 'Category retrieved successfully.'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Update category
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updateCategory(req, res, next) {
		try {
			const { categoryId } = req.params;
			const updateData = req.body;

			const updatedCategory = await categoryService.updateCategory(categoryId, updateData);

			res.status(200).json({
				responseCode: 200,
				responseData: updatedCategory,
				responseMessage: 'Category updated successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Delete category
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async deleteCategory(req, res, next) {
		try {
			const { categoryId } = req.params;
			await categoryService.deleteCategory(categoryId);

			res.status(200).json({
				responseCode: 200,
				responseMessage: 'Category deleted successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get products by category
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getProductsByCategory(req, res, next) {
		try {
			const { id } = req.params;
			const {
				page = 1,
				limit = 10,
				sort = 'name',
				order = 'asc',
				available
			} = req.query;

			const options = {
				page: parseInt(page, 10),
				limit: parseInt(limit, 10),
				sort,
				order,
				filters: {}
			};

			// Add filters if provided
			if (available !== undefined) {
				options.filters.isAvailable = available === 'true';
			}

			const products = await categoryService.getProductsByCategory(id, options);
			console.log(products)
			res.status(200).json({
				responseCode: 200,
				responseData: products,
				responseMessage: 'Products retrieved successfully.',
				pagination: {
					page: options.page,
					limit: options.limit,
					total: products.total,
					pages: Math.ceil(products.total / options.limit)
				}
			});
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new CategoryController();