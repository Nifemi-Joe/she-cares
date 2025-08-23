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

				if (item.price !== undefined && (isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0)) {
					itemError.price = 'Price must be a non-negative number';
				}

				if (Object.keys(itemError).length > 0) {
					itemErrors[index] = itemError;
				}
			});

			if (itemErrors.length > 0) {
				errors.items = itemErrors;
			}
		}

		// Shipping method validation
		if (orderData.shippingMethod) {
			if (!['pickup', 'delivery'].includes(orderData.shippingMethod)) {
				errors.shippingMethod = 'Shipping method must be either "pickup" or "delivery"';
			}

			// If shipping method is "delivery", shipping address is required
			if (orderData.shippingMethod === 'delivery') {
				if (!orderData.shippingAddress) {
					errors.shippingAddress = 'Shipping address is required for delivery orders';
				} else if (typeof orderData.shippingAddress !== 'object') {
					errors.shippingAddress = 'Shipping address must be an object';
				} else {
					const addressErrors = {};

					if (!orderData.shippingAddress.street || orderData.shippingAddress.street.trim() === '') {
						addressErrors.street = 'Street address is required';
					}

					if (!orderData.shippingAddress.city || orderData.shippingAddress.city.trim() === '') {
						addressErrors.city = 'City is required';
					}

					if (Object.keys(addressErrors).length > 0) {
						errors.shippingAddress = addressErrors;
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

		// Shipping cost validation - allow "TBD" for delivery orders
		if (orderData.shippingCost !== undefined) {
			if (orderData.shippingMethod === 'delivery') {
				// For delivery orders, allow "TBD" or valid numbers
				if (orderData.shippingCost !== 'TBD' &&
					(isNaN(parseFloat(orderData.shippingCost)) || parseFloat(orderData.shippingCost) < 0)) {
					errors.shippingCost = 'Shipping cost must be "TBD" or a non-negative number for delivery orders';
				}
			} else {
				// For pickup orders, must be a number (usually 0)
				if (isNaN(parseFloat(orderData.shippingCost)) || parseFloat(orderData.shippingCost) < 0) {
					errors.shippingCost = 'Shipping cost must be a non-negative number for pickup orders';
				}
			}
		}

		// Total amount validation - allow "TBD" when shipping cost is "TBD"
		if (orderData.totalAmount !== undefined) {
			if (orderData.shippingCost === 'TBD') {
				// If shipping cost is TBD, total amount should also be TBD
				if (orderData.totalAmount !== 'TBD') {
					errors.totalAmount = 'Total amount should be "TBD" when shipping cost is "TBD"';
				}
			} else {
				// Otherwise, must be a valid number
				if (isNaN(parseFloat(orderData.totalAmount)) || parseFloat(orderData.totalAmount) < 0) {
					errors.totalAmount = 'Total amount must be a non-negative number';
				}
			}
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

					if (item.price !== undefined && (isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0)) {
						itemError.price = 'Price must be a non-negative number';
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

		// Shipping method validation (if present)
		if (updateData.shippingMethod && !['pickup', 'delivery'].includes(updateData.shippingMethod)) {
			errors.shippingMethod = 'Shipping method must be either "pickup" or "delivery"';
		}

		// Shipping address validation (if present)
		if (updateData.shippingAddress !== undefined) {
			if (typeof updateData.shippingAddress !== 'object') {
				errors.shippingAddress = 'Shipping address must be an object';
			} else {
				const addressErrors = {};

				if (updateData.shippingAddress.street !== undefined && updateData.shippingAddress.street.trim() === '') {
					addressErrors.street = 'Street address cannot be empty';
				}

				if (updateData.shippingAddress.city !== undefined && updateData.shippingAddress.city.trim() === '') {
					addressErrors.city = 'City cannot be empty';
				}

				if (Object.keys(addressErrors).length > 0) {
					errors.shippingAddress = addressErrors;
				}
			}
		}

		// Shipping cost validation for updates
		if (updateData.shippingCost !== undefined) {
			if (updateData.shippingCost !== 'TBD' &&
				(isNaN(parseFloat(updateData.shippingCost)) || parseFloat(updateData.shippingCost) < 0)) {
				errors.shippingCost = 'Shipping cost must be "TBD" or a non-negative number';
			}
		}

		// Total amount validation for updates
		if (updateData.totalAmount !== undefined) {
			if (updateData.totalAmount !== 'TBD' &&
				(isNaN(parseFloat(updateData.totalAmount)) || parseFloat(updateData.totalAmount) < 0)) {
				errors.totalAmount = 'Total amount must be "TBD" or a non-negative number';
			}
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate delivery fee update
	 * @param {number} deliveryFee - Delivery fee to validate
	 * @returns {Object} Validation result with errors if any
	 */
	validateDeliveryFeeUpdate(deliveryFee) {
		const errors = {};

		if (deliveryFee === undefined || deliveryFee === null) {
			errors.deliveryFee = 'Delivery fee is required';
		} else if (isNaN(parseFloat(deliveryFee)) || parseFloat(deliveryFee) < 0) {
			errors.deliveryFee = 'Delivery fee must be a non-negative number';
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

		if (item.price !== undefined && (isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0)) {
			errors.price = 'Price must be a non-negative number';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}
}

module.exports = new OrderValidator();