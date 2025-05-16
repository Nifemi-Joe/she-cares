// src/domain/models/user.model.js

/**
 * @class User
 * @description User domain model for authentication and authorization
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class User {
	/**
	 * Create a new User instance
	 * @param {Object} userData - User information
	 * @param {string} userData.id - Unique identifier
	 * @param {string} userData.fullName - User's full name
	 * @param {string} userData.email - User's email address
	 * @param {string} userData.password - Hashed password
	 * @param {string} userData.role - User role (admin, staff)
	 * @param {boolean} userData.isActive - Whether user account is active
	 * @param {string} userData.phoneNumber - User's phone number
	 * @param {Object} userData.preferences - User preferences
	 * @param {Date} userData.lastLogin - Last login timestamp
	 * @param {Date} userData.createdAt - Creation timestamp
	 * @param {Date} userData.updatedAt - Last update timestamp
	 */
	constructor({
		            id,
		            fullName,
		            email,
		            password,
		            role = 'staff',
		            isActive = true,
		            phoneNumber = '',
		            preferences = {
			            notifications: true,
			            theme: 'light'
		            },
		            lastLogin = null,
		            createdAt = new Date(),
		            updatedAt = new Date()
	            }) {
		this.id = id;
		this.fullName = fullName;
		this.email = email;
		this.password = password; // Should be already hashed
		this.role = role;
		this.isActive = isActive;
		this.phoneNumber = phoneNumber;
		this.preferences = preferences;
		this.lastLogin = lastLogin;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
	}

	/**
	 * Check if user has admin permissions
	 * @return {boolean} Whether user is an admin
	 */
	isAdmin() {
		return this.role === 'admin';
	}

	/**
	 * Update user's last login time
	 */
	updateLastLogin() {
		this.lastLogin = new Date();
		this.updatedAt = new Date();
	}

	/**
	 * Activate user account
	 */
	activate() {
		this.isActive = true;
		this.updatedAt = new Date();
	}

	/**
	 * Deactivate user account
	 */
	deactivate() {
		this.isActive = false;
		this.updatedAt = new Date();
	}

	/**
	 * Update user profile information
	 * @param {Object} profileData - Updated profile data
	 */
	updateProfile(profileData) {
		const allowedFields = ['fullName', 'phoneNumber', 'preferences'];

		allowedFields.forEach(field => {
			if (profileData[field] !== undefined) {
				if (field === 'preferences' && this.preferences) {
					this.preferences = { ...this.preferences, ...profileData.preferences };
				} else {
					this[field] = profileData[field];
				}
			}
		});

		this.updatedAt = new Date();
	}

	/**
	 * Convert to plain object for serialization
	 * @returns {Object} Plain JavaScript object without sensitive data
	 */
	toJSON() {
		const { password, ...userWithoutPassword } = this;
		return userWithoutPassword;
	}
}

module.exports = User;