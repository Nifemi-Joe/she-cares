/**
 * @class ClientValidator
 * @description Validates client data against schema rules
 * @since v1.2.0 (2025)
 */

class ClientValidator {
	validateCreate(clientData) {
		const errors = {};

		// Name (required)
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

		// Email (if present)
		if (clientData.email && !this._isValidEmail(clientData.email)) {
			errors.email = 'Invalid email format';
		}

		// Phone (if present)
		if (clientData.phone && !this._isValidPhone(clientData.phone)) {
			errors.phone = 'Invalid phone number format';
		}

		// Address fields
		if (clientData.address) {
			const { street, city, state, country, postalCode } = clientData.address;

			if (street !== undefined && street.trim() === '') {
				errors.addressStreet = 'Street address cannot be empty';
			}
			if (city !== undefined && city.trim() === '') {
				errors.addressCity = 'City cannot be empty';
			}
			if (state !== undefined && state.trim() === '') {
				errors.addressState = 'State cannot be empty';
			}
			if (country !== undefined && country.trim() === '') {
				errors.addressCountry = 'Country cannot be empty';
			}
			if (postalCode !== undefined && postalCode.trim() === '') {
				errors.addressPostalCode = 'Postal code cannot be empty';
			}
		}

		// Preferred contact method
		if (clientData.preferredContactMethod && !['email', 'phone'].includes(clientData.preferredContactMethod)) {
			errors.preferredContactMethod = 'Preferred contact method must be either "email" or "phone"';
		}

		// Type (if used in your app logic)
		if (clientData.type && !['regular', 'vip', 'corporate'].includes(clientData.type)) {
			errors.type = 'Type must be one of: regular, vip, corporate';
		}

		// Tags
		if (clientData.tags && !Array.isArray(clientData.tags)) {
			errors.tags = 'Tags must be an array of strings';
		}

		// Referral Source
		if (clientData.referralSource && clientData.referralSource.trim() === '') {
			errors.referralSource = 'Referral source cannot be empty if provided';
		}

		// isActive
		if (clientData.isActive !== undefined && typeof clientData.isActive !== 'boolean') {
			errors.isActive = 'isActive must be a boolean';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	validateUpdate(updateData) {
		const errors = {};

		// Name (optional)
		if (updateData.name !== undefined) {
			if (updateData.name.trim() === '') {
				errors.name = 'Client name cannot be empty';
			} else if (updateData.name.length > 100) {
				errors.name = 'Client name cannot exceed 100 characters';
			}
		}

		// Email (optional)
		if (updateData.email !== undefined && updateData.email && !this._isValidEmail(updateData.email)) {
			errors.email = 'Invalid email format';
		}

		// Phone (optional)
		if (updateData.phone !== undefined && updateData.phone && !this._isValidPhone(updateData.phone)) {
			errors.phone = 'Invalid phone number format';
		}

		// Address (optional)
		if (updateData.address) {
			const { street, city, state, country, postalCode } = updateData.address;

			if (street !== undefined && street.trim() === '') {
				errors.addressStreet = 'Street address cannot be empty';
			}
			if (city !== undefined && city.trim() === '') {
				errors.addressCity = 'City cannot be empty';
			}
			if (state !== undefined && state.trim() === '') {
				errors.addressState = 'State cannot be empty';
			}
			if (country !== undefined && country.trim() === '') {
				errors.addressCountry = 'Country cannot be empty';
			}
			if (postalCode !== undefined && postalCode.trim() === '') {
				errors.addressPostalCode = 'Postal code cannot be empty';
			}
		}

		// Preferred contact method
		if (updateData.preferredContactMethod !== undefined &&
			!['email', 'phone'].includes(updateData.preferredContactMethod)) {
			errors.preferredContactMethod = 'Preferred contact method must be either "email" or "phone"';
		}

		// Tags
		if (updateData.tags !== undefined && !Array.isArray(updateData.tags)) {
			errors.tags = 'Tags must be an array of strings';
		}

		// Referral Source
		if (updateData.referralSource !== undefined && updateData.referralSource.trim() === '') {
			errors.referralSource = 'Referral source cannot be empty';
		}

		// isActive
		if (updateData.isActive !== undefined && typeof updateData.isActive !== 'boolean') {
			errors.isActive = 'isActive must be a boolean';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

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
			errors.state = 'State is required';
		}
		if (locationData.country !== undefined && locationData.country.trim() === '') {
			errors.country = 'Country cannot be empty';
		}
		if (locationData.postalCode !== undefined && locationData.postalCode.trim() === '') {
			errors.postalCode = 'Postal code cannot be empty';
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	_isValidEmail(email) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	_isValidPhone(phone) {
		const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;
		return phoneRegex.test(phone);
	}
}

module.exports = new ClientValidator();
