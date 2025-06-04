// src/domain/validators/delivery.validator.js

const { ValidationError } = require('../../utils/error-handler');

/**
 * @class DeliveryValidator
 * @description Validates delivery-related data
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class DeliveryValidator {
	/**
	 * Validate delivery creation data
	 * @param {Object} deliveryData - Delivery data to validate
	 * @throws {ValidationError} If validation fails
	 */
	validateCreate(deliveryData) {
		const errors = [];

		// Validate required fields
		if (!deliveryData.orderId) {
			errors.push('Order ID is required');
		}

		if (!deliveryData.status) {
			errors.push('Delivery status is required');
		} else {
			// Validate status
			const validStatuses = ['pending', 'scheduled', 'in_transit', 'delivered', 'failed', 'cancelled'];
			if (!validStatuses.includes(deliveryData.status)) {
				errors.push('Invalid delivery status');
			}
		}

		// Validate address if delivery type is 'home_delivery'
		if (deliveryData.type === 'home_delivery') {
			if (!deliveryData.deliveryAddress) {
				errors.push('Delivery address is required for home delivery');
			} else {
				if (!deliveryData.deliveryAddress.street) {
					errors.push('Street address is required for delivery');
				}
				if (!deliveryData.deliveryAddress.city) {
					errors.push('City is required for delivery');
				}
			}
		}

		// Validate scheduled date if provided
		if (deliveryData.scheduledDate) {
			const scheduledDate = new Date(deliveryData.scheduledDate);
			const currentDate = new Date();

			if (isNaN(scheduledDate.getTime())) {
				errors.push('Invalid scheduled date format');
			} else if (scheduledDate < currentDate) {
				errors.push('Scheduled date cannot be in the past');
			}
		}

		// Validate delivery fee if provided
		if (deliveryData.deliveryFee !== undefined && deliveryData.deliveryFee !== null) {
			const fee = parseFloat(deliveryData.deliveryFee);
			if (isNaN(fee) || fee < 0) {
				errors.push('Delivery fee must be a non-negative number');
			}
		}

		// If any errors were found, throw validation error
		if (errors.length > 0) {
			throw new ValidationError('Delivery validation failed', errors);
		}
	}

	/**
	 * Validate delivery update data
	 * @param {Object} updateData - Delivery update data
	 * @throws {ValidationError} If validation fails
	 */
	validateUpdate(updateData) {
		const errors = [];

		// Validate status if provided
		if (updateData.status) {
			const validStatuses = ['pending', 'scheduled', 'in_transit', 'delivered', 'failed', 'cancelled'];
			if (!validStatuses.includes(updateData.status)) {
				errors.push('Invalid delivery status');
			}
		}

		// Validate scheduled date if provided
		if (updateData.scheduledDate) {
			const scheduledDate = new Date(updateData.scheduledDate);
			const currentDate = new Date();

			if (isNaN(scheduledDate.getTime())) {
				errors.push('Invalid scheduled date format');
			} else if (scheduledDate < currentDate) {
				errors.push('Scheduled date cannot be in the past');
			}
		}

		// Validate delivery fee if provided
		if (updateData.deliveryFee !== undefined && updateData.deliveryFee !== null) {
			const fee = parseFloat(updateData.deliveryFee);
			if (isNaN(fee) || fee < 0) {
				errors.push('Delivery fee must be a non-negative number');
			}
		}

		// If any errors were found, throw validation error
		if (errors.length > 0) {
			throw new ValidationError('Delivery update validation failed', errors);
		}
	}

	/**
	 * Validate delivery status update
	 * @param {string} currentStatus - Current delivery status
	 * @param {string} newStatus - New delivery status
	 * @throws {ValidationError} If status transition is invalid
	 */
	validateStatusTransition(currentStatus, newStatus) {
		// Define valid status transitions
		const validTransitions = {
			'pending': ['scheduled', 'in_transit', 'cancelled'],
			'scheduled': ['in_transit', 'cancelled'],
			'in_transit': ['delivered', 'failed'],
			'delivered': [], // Terminal state
			'failed': ['scheduled', 'in_transit'], // Can retry
			'cancelled': ['pending'] // Can reactivate
		};

		// Check if transition is valid
		if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
			throw new ValidationError(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
		}
	}
}

module.exports = new DeliveryValidator();