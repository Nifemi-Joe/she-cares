// src/domain/models/client.model.js

/**
 * @class Client
 * @description Client domain model representing customers
 * @since v1.2.0 (2016)
 * @author SheCares Development Team
 */
class Client {
	/**
	 * Create a new Client instance
	 * @param {Object} clientData - Client information
	 * @param {string} clientData.id - Unique identifier
	 * @param {string} clientData.name - Client full name
	 * @param {string} clientData.email - Client email address
	 * @param {string} clientData.phone - Client phone number
	 * @param {Object} clientData.address - Client address information
	 * @param {string} clientData.address.street - Street address
	 * @param {string} clientData.address.city - City
	 * @param {string} clientData.address.state - State/province
	 * @param {string} clientData.address.country - Country
	 * @param {string} clientData.address.postalCode - Postal/ZIP code
	 * @param {Array} clientData.deliveryLocations - Additional delivery locations
	 * @param {string} clientData.preferredContactMethod - Email or Phone
	 * @param {Object} clientData.preferences - Client preferences
	 * @param {string} clientData.notes - Additional client notes
	 * @param {Date} clientData.lastOrderDate - Date of last order
	 * @param {number} clientData.totalOrders - Count of total orders
	 * @param {number} clientData.totalSpent - Total amount spent
	 * @param {Date} clientData.createdAt - Creation timestamp
	 * @param {Date} clientData.updatedAt - Last update timestamp
	 */
	constructor({
		            id,
		            name,
		            email,
		            phone,
		            address = {
			            street: '',
			            city: '',
			            state: '',
			            country: '',
			            postalCode: ''
		            },
		            deliveryLocations = [],
		            preferredContactMethod = 'email',
		            preferences = {},
		            notes = '',
		            lastOrderDate = null,
		            totalOrders = 0,
		            totalSpent = 0,
		            createdAt = new Date(),
		            updatedAt = new Date()
	            }) {
		this.id = id;
		this.name = name;
		this.email = email;
		this.phone = phone;
		this.address = address;
		this.deliveryLocations = deliveryLocations;
		this.preferredContactMethod = preferredContactMethod;
		this.preferences = preferences;
		this.notes = notes;
		this.lastOrderDate = lastOrderDate;
		this.totalOrders = totalOrders;
		this.totalSpent = totalSpent;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	/**
	 * Add a new delivery location
	 * @param {Object} location - Delivery location information
	 * @param {string} location.name - Location name/description
	 * @param {string} location.street - Street address
	 * @param {string} location.city - City
	 * @param {string} location.state - State/province
	 * @param {string} location.country - Country
	 * @param {string} location.postalCode - Postal/ZIP code
	 * @returns {string} - Generated location ID
	 */
	addDeliveryLocation(location) {
		const locationId = `loc_${Date.now()}`;
		this.deliveryLocations.push({
			id: locationId,
			...location,
			createdAt: new Date()
		});
		this.updatedAt = new Date();
		return locationId;
	}

	/**
	 * Remove a delivery location
	 * @param {string} locationId - ID of location to remove
	 * @returns {boolean} Whether location was found and removed
	 */
	removeDeliveryLocation(locationId) {
		const initialLength = this.deliveryLocations.length;
		this.deliveryLocations = this.deliveryLocations.filter(loc => loc.id !== locationId);

		if (this.deliveryLocations.length !== initialLength) {
			this.updatedAt = new Date();
			return true;
		}

		return false;
	}

	/**
	 * Update client preferences
	 * @param {string} key - Preference key
	 * @param {*} value - Preference value
	 */
	updatePreference(key, value) {
		this.preferences[key] = value;
		this.updatedAt = new Date();
	}

	/**
	 * Update client's primary address
	 * @param {Object} address - New address information
	 */
	updateAddress(address) {
		this.address = {
			...this.address,
			...address
		};
		this.updatedAt = new Date();
	}

	/**
	 * Add a note to client record
	 * @param {string} note - Note to add
	 */
	addNote(note) {
		const timestamp = new Date().toISOString();
		this.notes = this.notes ? `${this.notes}\n[${timestamp}]: ${note}` : `[${timestamp}]: ${note}`;
		this.updatedAt = new Date();
	}

	/**
	 * Update order statistics after a new order
	 * @param {number} orderAmount - Amount of new order
	 */
	recordOrder(orderAmount) {
		this.totalOrders += 1;
		this.totalSpent += orderAmount;
		this.lastOrderDate = new Date();
		this.updatedAt = new Date();
	}

	/**
	 * Get client's preferred contact information
	 * @returns {Object} - Contact details
	 */
	getContactInfo() {
		return {
			method: this.preferredContactMethod,
			value: this.preferredContactMethod === 'email' ? this.email : this.phone
		};
	}

	/**
	 * Convert to plain object for serialization
	 * @returns {Object} Plain JavaScript object
	 */
	toJSON() {
		return {
			id: this.id,
			name: this.name,
			email: this.email,
			phone: this.phone,
			address: this.address,
			deliveryLocations: this.deliveryLocations,
			preferredContactMethod: this.preferredContactMethod,
			preferences: this.preferences,
			notes: this.notes,
			lastOrderDate: this.lastOrderDate,
			totalOrders: this.totalOrders,
			totalSpent: this.totalSpent,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		};
	}
}

module.exports = Client;