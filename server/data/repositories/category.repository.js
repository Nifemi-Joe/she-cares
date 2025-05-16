// src/data/repositories/category.repository.js

const BaseRepository = require('./base.repository');
const CategorySchema = require('../schemas/category.schema');
const Category = require('../../domain/models/category.model');
const { DatabaseError } = require('../../utils/error-handler');

/**
 * @class CategoryRepository
 * @extends BaseRepository
 * @description Repository for category data operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class CategoryRepository extends BaseRepository {
	/**
	 * Initialize category repository
	 */
	constructor() {
		super('categories', CategorySchema);
	}

	/**
	 * Find category by name
	 * @param {string} name - Category name
	 * @returns {Promise<Category|null>} Category or null if not found
	 */
	async findByName(name) {
		try {
			const category = await this.collection.findOne({
				name: { $regex: new RegExp(`^${name}$`, 'i') }
			});
			return category ? this._toModel(category) : null;
		} catch (error) {
			throw new DatabaseError(`Error finding category by name: ${error.message}`);
		}
	}

	/**
	 * Find active categories
	 * @returns {Promise<Array<Category>>} List of active categories
	 */
	async findActiveCategories() {
		try {
			const categories = await this.collection.find({ isActive: true }).toArray();
			return categories.map(category => this._toModel(category));
		} catch (error) {
			throw new DatabaseError(`Error finding active categories: ${error.message}`);
		}
	}

	/**
	 * Find categories by parent ID
	 * @param {string|null} parentId - Parent category ID, null for root categories
	 * @returns {Promise<Array<Category>>} List of categories
	 */
	async findByParent(parentId = null) {
		try {
			const categories = await this.collection.find({ parentId }).toArray();
			return categories.map(category => this._toModel(category));
		} catch (error) {
			throw new DatabaseError(`Error finding categories by parent: ${error.message}`);
		}
	}

	/**
	 * Get category tree (hierarchical structure)
	 * @returns {Promise<Array<Object>>} Category tree
	 */
	async getCategoryTree() {
		try {
			// First, get all categories
			const allCategories = await this.findAll();

			// Create a map for faster lookup
			const categoryMap = {};
			allCategories.forEach(category => {
				categoryMap[category.id] = {
					...category,
					children: []
				};
			});

			// Build the tree
			const rootCategories = [];
			allCategories.forEach(category => {
				if (category.parentId) {
					// This is a child category
					if (categoryMap[category.parentId]) {
						categoryMap[category.parentId].children.push(categoryMap[category.id]);
					} else {
						// Parent doesn't exist, treat as root
						rootCategories.push(categoryMap[category.id]);
					}
				} else {
					// This is a root category
					rootCategories.push(categoryMap[category.id]);
				}
			});

			return rootCategories;
		} catch (error) {
			throw new DatabaseError(`Error getting category tree: ${error.message}`);
		}
	}

	/**
	 * Get categories with product counts
	 * @returns {Promise<Array<Object>>} Categories with product counts
	 */
	async getCategoriesWithProductCounts() {
		try {
			const categoryStats = await this.db.collection('products').aggregate([
				{
					$group: {
						_id: "$categoryId",
						count: { $sum: 1 }
					}
				}
			]).toArray();

			// Create a map of category IDs to product counts
			const countMap = {};
			categoryStats.forEach(stat => {
				countMap[stat._id] = stat.count;
			});

			// Get all categories and add product counts
			const categories = await this.findAll();
			return categories.map(category => ({
				...category,
				productCount: countMap[category.id] || 0
			}));
		} catch (error) {
			throw new DatabaseError(`Error getting categories with product counts: ${error.message}`);
		}
	}

	/**
	 * Convert database object to domain model
	 * @param {Object} dbObject - Database object
	 * @returns {Category} Category domain model
	 * @protected
	 */
	_toModel(dbObject) {
		return new Category({
			id: dbObject._id.toString(),
			name: dbObject.name,
			description: dbObject.description,
			isActive: dbObject.isActive,
			parentId: dbObject.parentId,
			imageUrl: dbObject.imageUrl,
			displayOrder: dbObject.displayOrder,
			attributes: dbObject.attributes,
			createdAt: dbObject.createdAt,
			updatedAt: dbObject.updatedAt
		});
	}

	/**
	 * Convert domain model to database object
	 * @param {Category} model - Category domain model
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

module.exports = new CategoryRepository();