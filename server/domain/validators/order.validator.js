// src/domain/validators/order.validator.js

/**
 * @class OrderValidator
 * @description Validates order data
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class OrderValidator {
	/**
	 * Validate order creation data
	 * @param {Object} orderData - Order data to validate
	 * @returns {Object} Validation result with errors if any
	 */
	validateCreate(orderData) {
		const errors = {};

		// Client ID is required
		if (!orderData.clientId || orderData.clientId.trim() === '') {
			errors.clientId = 'Client ID is required';
		}

		// Items validation
		if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
			errors.items = 'Order must have at least one item';
		} else {
			const itemErrors = [];

			orderData.items.forEach((item, index) => {
				const itemError = {};

				if (!item.productId || item.productId.trim() === '') {
					itemError.productId = 'Product ID is required';
				}

				if (item.quantity === undefined || item.quantity === null) {
					itemError.quantity = 'Quantity is required';
				} else if (isNaN(parseInt(item.quantity)) || parseInt(item.quantity) <= 0) {
					itemError.quantity = 'Quantity must be a positive integer';
				}

				if (item.unitPrice !== undefined && (isNaN(parseFloat(item.unitPrice)) || parseFloat(item.unitPrice) < 0)) {
					itemError.unitPrice = 'Unit price must be a non-negative number';
				}

				if (Object.keys(itemError).length > 0) {
					itemErrors[index] = itemError;
				}
			});

			if (itemErrors.length > 0) {
				errors.items = itemErrors;
			}
		}

		// Delivery method validation
		if (orderData.deliveryMethod) {
			if (!['pickup', 'delivery'].includes(orderData.deliveryMethod)) {
				errors.deliveryMethod = 'Delivery method must be either "pickup" or "delivery"';
			}

			// If delivery method is "delivery", delivery address is required
			if (orderData.deliveryMethod === 'delivery') {
				if (!orderData.deliveryAddress) {
					errors.deliveryAddress = 'Delivery address is required for delivery orders';
				} else if (typeof orderData.deliveryAddress !== 'object') {
					errors.deliveryAddress = 'Delivery address must be an object';
				} else {
					const addressErrors = {};

					if (!orderData.deliveryAddress.street || orderData.deliveryAddress.street.trim() === '') {
						addressErrors.street = 'Street address is required';
					}

					if (!orderData.deliveryAddress.city || orderData.deliveryAddress.city.trim() === '') {
						addressErrors.city = 'City is required';
					}

					if (Object.keys(addressErrors).length > 0) {
						errors.deliveryAddress = addressErrors;
					}
				}
			}
		}

		// Status validation
		if (orderData.status && !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(orderData.status)) {
			errors.status = 'Invalid order status';
		}

		// Payment status validation
		if (orderData.paymentStatus && !['pending', 'paid', 'partially_paid', 'refunded', 'failed'].includes(orderData.paymentStatus)) {
			errors.paymentStatus = 'Invalid payment status';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate order update data
	 * @param {Object} updateData - Order update data
	 * @returns {Object} Validation result with errors if any
	 */
	validateUpdate(updateData) {
		const errors = {};

		// Items validation (if present)
		if (updateData.items !== undefined) {
			if (!Array.isArray(updateData.items) || updateData.items.length === 0) {
				errors.items = 'Order must have at least one item';
			} else {
				const itemErrors = [];

				updateData.items.forEach((item, index) => {
					const itemError = {};

					if (!item.productId || item.productId.trim() === '') {
						itemError.productId = 'Product ID is required';
					}

					if (item.quantity !== undefined) {
						if (isNaN(parseInt(item.quantity)) || parseInt(item.quantity) <= 0) {
							itemError.quantity = 'Quantity must be a positive integer';
						}
					}

					if (item.unitPrice !== undefined && (isNaN(parseFloat(item.unitPrice)) || parseFloat(item.unitPrice) < 0)) {
						itemError.unitPrice = 'Unit price must be a non-negative number';
					}

					if (Object.keys(itemError).length > 0) {
						itemErrors[index] = itemError;
					}
				});

				if (itemErrors.length > 0) {
					errors.items = itemErrors;
				}
			}
		}

		// Status validation (if present)
		if (updateData.status && !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(updateData.status)) {
			errors.status = 'Invalid order status';
		}

		// Payment status validation (if present)
		if (updateData.paymentStatus && !['pending', 'paid', 'partially_paid', 'refunded', 'failed'].includes(updateData.paymentStatus)) {
			errors.paymentStatus = 'Invalid payment status';
		}

		// Delivery method validation (if present)
		if (updateData.deliveryMethod && !['pickup', 'delivery'].includes(updateData.deliveryMethod)) {
			errors.deliveryMethod = 'Delivery method must be either "pickup" or "delivery"';
		}

		// Delivery address validation (if present)
		if (updateData.deliveryAddress !== undefined) {
			if (typeof updateData.deliveryAddress !== 'object') {
				errors.deliveryAddress = 'Delivery address must be an object';
			} else {
				const addressErrors = {};

				if (updateData.deliveryAddress.street !== undefined && updateData.deliveryAddress.street.trim() === '') {
					addressErrors.street = 'Street address cannot be empty';
				}

				if (updateData.deliveryAddress.city !== undefined && updateData.deliveryAddress.city.trim() === '') {
					addressErrors.city = 'City cannot be empty';
				}

				if (Object.keys(addressErrors).length > 0) {
					errors.deliveryAddress = addressErrors;
				}
			}
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate status update
	 * @param {string} status - New status
	 * @returns {Object} Validation result with errors if any
	 */
	validateStatusUpdate(status) {
		const errors = {};
		const statusType = status.status
		if (!statusType || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(statusType)) {
			errors.status = 'Invalid order status';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate payment status update
	 * @param {string} paymentStatus - New payment status
	 * @returns {Object} Validation result with errors if any
	 */
	validatePaymentStatusUpdate(paymentStatus) {
		const errors = {};

		if (!paymentStatus || !['pending', 'paid', 'partially_paid', 'refunded', 'failed'].includes(paymentStatus)) {
			errors.paymentStatus = 'Invalid payment status';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate order item
	 * @param {Object} item - Order item data
	 * @returns {Object} Validation result with errors if any
	 */
	validateOrderItem(item) {
		const errors = {};

		if (!item.productId || item.productId.trim() === '') {
			errors.productId = 'Product ID is required';
		}

		if (item.quantity === undefined || item.quantity === null) {
			errors.quantity = 'Quantity is required';
		} else if (isNaN(parseInt(item.quantity)) || parseInt(item.quantity) <= 0) {
			errors.quantity = 'Quantity must be a positive integer';
		}

		if (item.unitPrice !== undefined && (isNaN(parseFloat(item.unitPrice)) || parseFloat(item.unitPrice) < 0)) {
			errors.unitPrice = 'Unit price must be a non-negative number';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}
}

module.exports = new OrderValidator();