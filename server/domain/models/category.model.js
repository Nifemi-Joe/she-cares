// src/domain/models/category.model.js

/**
 * @class Category
 * @description Category domain model for product organization
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */
class Category {
	/**
	 * Create a new Category instance
	 * @param {Object} categoryData - Category information
	 * @param {string} categoryData.id - Unique identifier
	 * @param {string} categoryData.name - Category name
	 * @param {string} categoryData.description - Category description
	 * @param {string} categoryData.imageUrl - Category image
	 * @param {string} categoryData.parentId - Parent category ID (for nested categories)
	 * @param {number} categoryData.displayOrder - Order for display purposes
	 * @param {Date} categoryData.createdAt - Creation timestamp
	 * @param {Date} categoryData.updatedAt - Last update timestamp
	 */
	constructor({
		            id,
		            name,
		            description,
		            imageUrl = null,
		            parentId = null,
		            displayOrder = 0,
		            attributes = [],
		            isActive = true,
		            createdAt = new Date(),
		            updatedAt = new Date()
	            }) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.imageUrl = imageUrl;
		this.parentId = parentId;
		this.displayOrder = displayOrder;
		this.attributes = attributes;
		this.isActive = isActive;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	/**
	 * Add a new attribute definition to this category
	 * @param {string} name - Attribute name
	 * @param {string} type - Attribute type (text, number, boolean, etc)
	 * @param {boolean} required - Whether attribute is required
	 * @param {Array} options - Possible values for enum types
	 */
	addAttribute(name, type, required = false, options = []) {
		this.attributes.push({
			name,
			type,
			required,
			options
		});
		this.updatedAt = new Date();
	}

	/**
	 * Remove an attribute from this category
	 * @param {string} attributeName - Name of attribute to remove
	 * @returns {boolean} Whether attribute was found and removed
	 */
	removeAttribute(attributeName) {
		const initialLength = this.attributes.length;
		this.attributes = this.attributes.filter(attr => attr.name !== attributeName);

		if (this.attributes.length !== initialLength) {
			this.updatedAt = new Date();
			return true;
		}

		return false;
	}

	/**
	 * Set category active status
	 * @param {boolean} isActive - New active status
	 */
	setActiveStatus(isActive) {
		this.isActive = isActive;
		this.updatedAt = new Date();
	}

	/**
	 * Set display order for the category
	 * @param {number} order - New display order
	 */
	setDisplayOrder(order) {
		this.displayOrder = order;
		this.updatedAt = new Date();
	}

	/**
	 * Set parent category
	 * @param {string} parentId - Parent category ID
	 */
	setParent(parentId) {
		this.parentId = parentId;
		this.updatedAt = new Date();
	}

	/**
	 * Convert to plain object for serialization
	 * @returns {Object} Plain JavaScript object
	 */
	toJSON() {
		return {
			id: this.id,
			name: this.name,
			description: this.description,
			imageUrl: this.imageUrl,
			parentId: this.parentId,
			displayOrder: this.displayOrder,
			attributes: this.attributes,
			isActive: this.isActive,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		};
	}
}

module.exports = Category;