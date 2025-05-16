// src/domain/validators/category.validator.js

/**
 * @class CategoryValidator
 * @description Validates category data
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class CategoryValidator {
	/**
	 * Validate category creation data
	 * @param {Object} categoryData - Category data to validate
	 * @returns {Object} Validation result with errors if any
	 */
	validateCreate(categoryData) {
		const errors = {};

		// Required fields
		if (!categoryData.name || categoryData.name.trim() === '') {
			errors.name = 'Category name is required';
		} else if (categoryData.name.length > 50) {
			errors.name = 'Category name cannot exceed 50 characters';
		}

		// Optional fields validation
		if (categoryData.description && categoryData.description.length > 500) {
			errors.description = 'Description cannot exceed 500 characters';
		}

		// Image URL validation (if present)
		if (categoryData.imageUrl && !this._isValidUrl(categoryData.imageUrl)) {
			errors.imageUrl = 'Invalid image URL format';
		}

		// Order validation (if present)
		if (categoryData.displayOrder !== undefined) {
			if (isNaN(parseInt(categoryData.displayOrder)) || parseInt(categoryData.displayOrder) < 0) {
				errors.displayOrder = 'Display order must be a valid non-negative integer';
			}
		}

		// Parent category validation (if present)
		if (categoryData.parentId !== undefined && categoryData.parentId !== null && categoryData.parentId.trim() === '') {
			errors.parentId = 'Parent category ID cannot be empty string';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate category update data
	 * @param {Object} updateData - Category update data
	 * @returns {Object} Validation result with errors if any
	 */
	validateUpdate(updateData) {
		const errors = {};

		// Name validation (if present)
		if (updateData.name !== undefined) {
			if (updateData.name.trim() === '') {
				errors.name = 'Category name cannot be empty';
			} else if (updateData.name.length > 50) {
				errors.name = 'Category name cannot exceed 50 characters';
			}
		}

		// Description validation (if present)
		if (updateData.description !== undefined && updateData.description.length > 500) {
			errors.description = 'Description cannot exceed 500 characters';
		}

		// Image URL validation (if present)
		if (updateData.imageUrl !== undefined && updateData.imageUrl !== null && !this._isValidUrl(updateData.imageUrl)) {
			errors.imageUrl = 'Invalid image URL format';
		}

		// Order validation (if present)
		if (updateData.displayOrder !== undefined) {
			if (isNaN(parseInt(updateData.displayOrder)) || parseInt(updateData.displayOrder) < 0) {
				errors.displayOrder = 'Display order must be a valid non-negative integer';
			}
		}

		// Parent category validation (if present)
		if (updateData.parentId !== undefined && updateData.parentId !== null && updateData.parentId.trim() === '') {
			errors.parentId = 'Parent category ID cannot be empty string';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Check if string is a valid URL
	 * @param {string} url - URL to validate
	 * @returns {boolean} Whether URL is valid
	 * @private
	 */
	_isValidUrl(url) {
		try {
			new URL(url);
			return true;
		} catch (e) {
			return false;
		}
	}
}

module.exports = new CategoryValidator();