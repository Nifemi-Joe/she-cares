// src/services/category.service.js

const categoryRepository = require('../data/repositories/category.repository');
const { NotFoundError, ValidationError } = require('../utils/error-handler');
const eventDispatcher = require('../domain/events/event-dispatcher');
const eventTypes = require('../domain/events/event-types');

/**
 * @class CategoryService
 * @description Service handling product category operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class CategoryService {
	/**
	 * Create a new category
	 * @param {Object} categoryData - Category data
	 * @returns {Object} Created category
	 */
	async createCategory(categoryData) {
		// Validate category data
		if (!categoryData.name) {
			throw new ValidationError('Category name is required');
		}

		// Check if category already exists with the same name
		const existingCategory = await categoryRepository.findByName(categoryData.name);
		if (existingCategory) {
			throw new ValidationError('Category with this name already exists');
		}

		const category = await categoryRepository.create(categoryData);

		// Dispatch event for category creation
		eventDispatcher.dispatch(eventTypes.CATEGORY_CREATED, { category });

		return category;
	}

	/**
	 * Get all categories
	 * @param {Object} options - Query options (sort, filter)
	 * @returns {Array} List of categories
	 */
	async getAllCategories(options = {}) {
		return categoryRepository.findAll(options);
	}

	/**
	 * Get category by ID
	 * @param {string} categoryId - Category ID
	 * @returns {Object} Category
	 */
	async getCategoryById(categoryId) {
		const category = await categoryRepository.findById(categoryId);
		if (!category) {
			throw new NotFoundError('Category not found');
		}
		return category;
	}

	/**
	 * Update category
	 * @param {string} categoryId - Category ID
	 * @param {Object} updateData - Category update data
	 * @returns {Object} Updated category
	 */
	async updateCategory(categoryId, updateData) {
		// Check if category exists
		const existingCategory = await categoryRepository.findById(categoryId);
		if (!existingCategory) {
			throw new NotFoundError('Category not found');
		}

		// Check if name is being updated and if it's unique
		if (updateData.name && updateData.name !== existingCategory.name) {
			const categoryWithSameName = await categoryRepository.findByName(updateData.name);
			if (categoryWithSameName && categoryWithSameName.id !== categoryId) {
				throw new ValidationError('Category with this name already exists');
			}
		}

		const updatedCategory = await categoryRepository.update(categoryId, updateData);

		// Dispatch event for category update
		eventDispatcher.dispatch(eventTypes.CATEGORY_UPDATED, {
			categoryId,
			updates: updateData,
			category: updatedCategory
		});

		return updatedCategory;
	}

	/**
	 * Delete category
	 * @param {string} categoryId - Category ID
	 * @returns {boolean} Whether category was deleted
	 */
	async deleteCategory(categoryId) {
		// Check if category exists
		const category = await categoryRepository.findById(categoryId);
		if (!category) {
			throw new NotFoundError('Category not found');
		}

		// Check if category has associated products
		const hasProducts = await this.categoryHasProducts(categoryId);
		if (hasProducts) {
			throw new ValidationError('Cannot delete category with associated products');
		}

		const result = await categoryRepository.delete(categoryId);

		// Dispatch event for category deletion
		if (result) {
			eventDispatcher.dispatch(eventTypes.CATEGORY_DELETED, { categoryId, category });
		}

		return result;
	}

	/**
	 * Check if category has associated products
	 * @param {string} categoryId - Category ID
	 * @returns {boolean} Whether category has products
	 */
	async categoryHasProducts(categoryId) {
		// This would typically be implemented by the product repository
		// For now, we'll assume a method exists to check this
		const productRepository = require('../data/repositories/product.repository');
		const productsCount = await productRepository.countByCategoryId(categoryId);
		return productsCount > 0;
	}

	/**
	 * Get products by category
	 * @param {string} categoryId - Category ID
	 * @param {Object} options - Query options (pagination, sorting)
	 * @returns {Array} List of products in the category
	 */

	async getProductsByCategory(categoryId, options = {}) {
		console.log('Looking for category with ID:', categoryId);

		// Check if category exists
		const category = await categoryRepository.findById(categoryId);
		console.log('Found category:', category);

		if (!category) {
			console.log('Category not found for ID:', categoryId);
			throw new NotFoundError('Category not found');
		}

		console.log('Category found, fetching products...');
		const productRepository = require('../data/repositories/product.repository');
		const products = await productRepository.findByCategoryId(categoryId, options);
		console.log('Found products:', products.length);

		return products;
	}
}

module.exports = new CategoryService();