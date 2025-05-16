// src/domain/validators/client.validator.js

/**
 * @class ClientValidator
 * @description Validates client data
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class ClientValidator {
	/**
	 * Validate client creation data
	 * @param {Object} clientData - Client data to validate
	 * @returns {Object} Validation result with errors if any
	 */
	validateCreate(clientData) {
		const errors = {};

		// Required fields
		if (!clientData.name || clientData.name.trim() === '') {
			errors.name = 'Client name is required';
		} else if (clientData.name.length > 100) {
			errors.name = 'Client name cannot exceed 100 characters';
		}

		// Either email or phone is required
		if ((!clientData.email || clientData.email.trim() === '') &&
			(!clientData.phone || clientData.phone.trim() === '')) {
			errors.contact = 'Either email or phone number is required';
		}

		// Email validation (if present)
		if (clientData.email && !this._isValidEmail(clientData.email)) {
			errors.email = 'Invalid email format';
		}

		// Phone validation (if present)
		if (clientData.phone && !this._isValidPhone(clientData.phone)) {
			errors.phone = 'Invalid phone number format';
		}

		// Address validation (if present)
		if (clientData.address) {
			if (typeof clientData.address !== 'object') {
				errors.address = 'Address must be an object';
			} else {
				const addressErrors = {};

				// Required address fields when address is provided
				if (!clientData.address.street || clientData.address.street.trim() === '') {
					addressErrors.street = 'Street address is required';
				}

				if (!clientData.address.city || clientData.address.city.trim() === '') {
					addressErrors.city = 'City is required';
				}

				if (!clientData.address.state || clientData.address.state.trim() === '') {
					addressErrors.state = 'State/province is required';
				}

				if (Object.keys(addressErrors).length > 0) {
					errors.address = addressErrors;
				}
			}
		}

		// Delivery locations validation (if present)
		if (clientData.deliveryLocations) {
			if (!Array.isArray(clientData.deliveryLocations)) {
				errors.deliveryLocations = 'Delivery locations must be an array';
			} else {
				const locationErrors = [];

				clientData.deliveryLocations.forEach((location, index) => {
					const locError = {};

					if (!location.name || location.name.trim() === '') {
						locError.name = 'Location name is required';
					}

					if (!location.street || location.street.trim() === '') {
						locError.street = 'Street address is required';
					}

					if (!location.city || location.city.trim() === '') {
						locError.city = 'City is required';
					}

					if (!location.state || location.state.trim() === '') {
						locError.state = 'State/province is required';
					}

					if (Object.keys(locError).length > 0) {
						locationErrors[index] = locError;
					}
				});

				if (locationErrors.length > 0) {
					errors.deliveryLocations = locationErrors;
				}
			}
		}

		// Preferred contact method validation (if present)
		if (clientData.preferredContactMethod &&
			!['email', 'phone'].includes(clientData.preferredContactMethod)) {
			errors.preferredContactMethod = 'Preferred contact method must be either "email" or "phone"';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate client update data
	 * @param {Object} updateData - Client update data
	 * @returns {Object} Validation result with errors if any
	 */
	validateUpdate(updateData) {
		const errors = {};

		// Name validation (if present)
		if (updateData.name !== undefined) {
			if (updateData.name.trim() === '') {
				errors.name = 'Client name cannot be empty';
			} else if (updateData.name.length > 100) {
				errors.name = 'Client name cannot exceed 100 characters';
			}
		}

		// Email validation (if present)
		if (updateData.email !== undefined && updateData.email !== null && !this._isValidEmail(updateData.email)) {
			errors.email = 'Invalid email format';
		}

		// Phone validation (if present)
		if (updateData.phone !== undefined && updateData.phone !== null && !this._isValidPhone(updateData.phone)) {
			errors.phone = 'Invalid phone number format';
		}

		// Address validation (if present)
		if (updateData.address !== undefined) {
			if (typeof updateData.address !== 'object') {
				errors.address = 'Address must be an object';
			} else {
				const addressErrors = {};

				if (updateData.address.street !== undefined && updateData.address.street.trim() === '') {
					addressErrors.street = 'Street address cannot be empty';
				}

				if (updateData.address.city !== undefined && updateData.address.city.trim() === '') {
					addressErrors.city = 'City cannot be empty';
				}

				if (updateData.address.state !== undefined && updateData.address.state.trim() === '') {
					addressErrors.state = 'State/province cannot be empty';
				}

				if (Object.keys(addressErrors).length > 0) {
					errors.address = addressErrors;
				}
			}
		}

		// Preferred contact method validation (if present)
		if (updateData.preferredContactMethod !== undefined &&
			!['email', 'phone'].includes(updateData.preferredContactMethod)) {
			errors.preferredContactMethod = 'Preferred contact method must be either "email" or "phone"';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate delivery location data
	 * @param {Object} locationData - Delivery location data
	 * @returns {Object} Validation result with errors if any
	 */
	validateDeliveryLocation(locationData) {
		const errors = {};

		if (!locationData.name || locationData.name.trim() === '') {
			errors.name = 'Location name is required';
		}

		if (!locationData.street || locationData.street.trim() === '') {
			errors.street = 'Street address is required';
		}

		if (!locationData.city || locationData.city.trim() === '') {
			errors.city = 'City is required';
		}

		if (!locationData.state || locationData.state.trim() === '') {
			errors.state = 'State/province is required';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Check if string is a valid email
	 * @param {string} email - Email to validate
	 * @returns {boolean} Whether email is valid
	 * @private
	 */
	_isValidEmail(email) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	/**
	 * Check if string is a valid phone number
	 * @param {string} phone - Phone number to validate
	 * @returns {boolean} Whether phone number is valid
	 * @private
	 */
	_isValidPhone(phone) {
		// Basic phone validation - can be enhanced for specific formats
		const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;
		return phoneRegex.test(phone);
	}
}

module.exports = new ClientValidator();