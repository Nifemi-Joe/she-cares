// src/domain/validators/product.validator.js

/**
 * @class ProductValidator
 * @description Validates product data
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class ProductValidator {
	/**
	 * Validate product creation data
	 * @param {Object} productData - Product data to validate
	 * @returns {Object} Validation result with errors if any
	 */
	validateCreate(productData) {
		const errors = {};

		// Required fields
		if (!productData.name || productData.name.trim() === '') {
			errors.name = 'Product name is required';
		} else if (productData.name.length > 100) {
			errors.name = 'Product name cannot exceed 100 characters';
		}

		// Category is required
		if (!productData.categoryId) {
			errors.categoryId = 'Category is required';
		}

		// Price validation
		if (productData.price === undefined || productData.price === null) {
			errors.price = 'Price is required';
		} else if (isNaN(parseFloat(productData.price)) || parseFloat(productData.price) < 0) {
			errors.price = 'Price must be a valid non-negative number';
		}

		// Stock validation
		if (productData.stock !== undefined && productData.stock !== null) {
			if (isNaN(parseInt(productData.stock)) || parseInt(productData.stock) < 0) {
				errors.stock = 'Stock must be a valid non-negative integer';
			}
		}

		// Unit validation
		if (!productData.unit || productData.unit.trim() === '') {
			errors.unit = 'Unit of measure is required (e.g., piece, basket, kg)';
		}

		// Optional fields validation
		if (productData.description && productData.description.length > 1000) {
			errors.description = 'Description cannot exceed 1000 characters';
		}

		// Images validation (if present)
		if (productData.images && !Array.isArray(productData.images)) {
			errors.images = 'Images must be an array';
		}

		// Pricing variations validation (if present)
		if (productData.pricingVariations) {
			if (!Array.isArray(productData.pricingVariations)) {
				errors.pricingVariations = 'Pricing variations must be an array';
			} else {
				const variationErrors = [];

				productData.pricingVariations.forEach((variation, index) => {
					const varError = {};

					if (!variation.name || variation.name.trim() === '') {
						varError.name = 'Variation name is required';
					}

					if (variation.price === undefined || variation.price === null) {
						varError.price = 'Variation price is required';
					} else if (isNaN(parseFloat(variation.price)) || parseFloat(variation.price) < 0) {
						varError.price = 'Variation price must be a valid non-negative number';
					}

					if (Object.keys(varError).length > 0) {
						variationErrors[index] = varError;
					}
				});

				if (variationErrors.length > 0) {
					errors.pricingVariations = variationErrors;
				}
			}
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate product update data
	 * @param {Object} updateData - Product update data
	 * @returns {Object} Validation result with errors if any
	 */
	validateUpdate(updateData) {
		const errors = {};

		// Name validation (if present)
		if (updateData.name !== undefined) {
			if (updateData.name.trim() === '') {
				errors.name = 'Product name cannot be empty';
			} else if (updateData.name.length > 100) {
				errors.name = 'Product name cannot exceed 100 characters';
			}
		}

		// Price validation (if present)
		if (updateData.price !== undefined) {
			if (isNaN(parseFloat(updateData.price)) || parseFloat(updateData.price) < 0) {
				errors.price = 'Price must be a valid non-negative number';
			}
		}

		// Stock validation (if present)
		if (updateData.stock !== undefined) {
			if (isNaN(parseInt(updateData.stock)) || parseInt(updateData.stock) < 0) {
				errors.stock = 'Stock must be a valid non-negative integer';
			}
		}

		// Unit validation (if present)
		if (updateData.unit !== undefined && updateData.unit.trim() === '') {
			errors.unit = 'Unit of measure cannot be empty';
		}

		// Description validation (if present)
		if (updateData.description !== undefined && updateData.description.length > 1000) {
			errors.description = 'Description cannot exceed 1000 characters';
		}

		// Images validation (if present)
		if (updateData.images !== undefined && !Array.isArray(updateData.images)) {
			errors.images = 'Images must be an array';
		}

		// Pricing variations validation (if present)
		if (updateData.pricingVariations !== undefined) {
			if (!Array.isArray(updateData.pricingVariations)) {
				errors.pricingVariations = 'Pricing variations must be an array';
			} else {
				const variationErrors = [];

				updateData.pricingVariations.forEach((variation, index) => {
					const varError = {};

					if (!variation.name || variation.name.trim() === '') {
						varError.name = 'Variation name is required';
					}

					if (variation.price === undefined || variation.price === null) {
						varError.price = 'Variation price is required';
					} else if (isNaN(parseFloat(variation.price)) || parseFloat(variation.price) < 0) {
						varError.price = 'Variation price must be a valid non-negative number';
					}

					if (Object.keys(varError).length > 0) {
						variationErrors[index] = varError;
					}
				});

				if (variationErrors.length > 0) {
					errors.pricingVariations = variationErrors;
				}
			}
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}
}

module.exports = new ProductValidator();