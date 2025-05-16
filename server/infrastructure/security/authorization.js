// src/infrastructure/security/authorization.js

const { AuthorizationError } = require('../../utils/error-handler');
const { logger } = require('../logging/logger');

/**
 * @class Authorization
 * @description Handles authorization and access control
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class Authorization {
	constructor() {
		// Define permission structure
		this.permissions = {
			// User management
			'user:create': ['admin'],
			'user:read': ['admin', 'staff'],
			'user:update': ['admin'],
			'user:delete': ['admin'],

			// Product management
			'product:create': ['admin', 'staff'],
			'product:read': ['admin', 'staff'],
			'product:update': ['admin', 'staff'],
			'product:delete': ['admin'],

			// Category management
			'category:create': ['admin', 'staff'],
			'category:read': ['admin', 'staff'],
			'category:update': ['admin', 'staff'],
			'category:delete': ['admin'],

			// Client management
			'client:create': ['admin', 'staff'],
			'client:read': ['admin', 'staff'],
			'client:update': ['admin', 'staff'],
			'client:delete': ['admin'],

			// Order management
			'order:create': ['admin', 'staff'],
			'order:read': ['admin', 'staff'],
			'order:update': ['admin', 'staff'],
			'order:delete': ['admin'],

			// Invoice management
			'invoice:create': ['admin', 'staff'],
			'invoice:read': ['admin', 'staff'],
			'invoice:update': ['admin', 'staff'],
			'invoice:delete': ['admin'],

			// Delivery management
			'delivery:create': ['admin', 'staff'],
			'delivery:read': ['admin', 'staff'],
			'delivery:update': ['admin', 'staff'],
			'delivery:delete': ['admin'],

			// Analytics
			'analytics:view': ['admin'],

			// System settings
			'settings:update': ['admin']
		};
	}

	/**
	 * Check if user has required permission
	 * @param {string} userRole - User role
	 * @param {string} permission - Required permission
	 * @returns {boolean} Whether user has permission
	 */
	hasPermission(userRole, permission) {
		// If permission doesn't exist in our structure, deny by default
		if (!this.permissions[permission]) {
			logger.warn(`Permission check for undefined permission: ${permission}`);
			return false;
		}

		// Check if user role is allowed for this permission
		return this.permissions[permission].includes(userRole);
	}

	/**
	 * Check if user has any of the required permissions
	 * @param {string} userRole - User role
	 * @param {Array<string>} permissions - List of permissions (OR logic)
	 * @returns {boolean} Whether user has any of the permissions
	 */
	hasAnyPermission(userRole, permissions) {
		return permissions.some(permission => this.hasPermission(userRole, permission));
	}

	/**
	 * Check if user has all required permissions
	 * @param {string} userRole - User role
	 * @param {Array<string>} permissions - List of permissions (AND logic)
	 * @returns {boolean} Whether user has all the permissions
	 */
	hasAllPermissions(userRole, permissions) {
		return permissions.every(permission => this.hasPermission(userRole, permission));
	}

	/**
	 * Check if user owns a resource
	 * @param {string} userId - User ID
	 * @param {Object} resource - Resource object
	 * @param {string} ownerField - Field name for owner ID in resource
	 * @returns {boolean} Whether user owns the resource
	 */
	isResourceOwner(userId, resource, ownerField = 'userId') {
		return resource && resource[ownerField] === userId;
	}

	/**
	 * Authorize access based on permission
	 * @param {string} userRole - User role
	 * @param {string} permission - Required permission
	 * @throws {AuthorizationError} If user doesn't have permission
	 */
	authorize(userRole, permission) {
		if (!this.hasPermission(userRole, permission)) {
			logger.warn(`Authorization failed: ${userRole} lacks permission ${permission}`);
			throw new AuthorizationError(`You don't have permission to perform this action`);
		}
	}

	/**
	 * Authorize access based on ownership or role permission
	 * @param {string} userId - User ID
	 * @param {string} userRole - User role
	 * @param {Object} resource - Resource to check ownership of
	 * @param {string} adminPermission - Permission that admins have
	 * @param {string} ownerField - Field name for owner ID in resource
	 * @throws {AuthorizationError} If user isn't authorized
	 */
	authorizeOwnerOrPermission(userId, userRole, resource, adminPermission, ownerField = 'userId') {
		const isOwner = this.isResourceOwner(userId, resource, ownerField);
		const hasAdminPermission = this.hasPermission(userRole, adminPermission);

		if (!isOwner && !hasAdminPermission) {
			logger.warn(`Owner/permission authorization failed for user ${userId} with role ${userRole}`);
			throw new AuthorizationError(`You don't have permission to access this resource`);
		}
	}

	/**
	 * Get all permissions for a role
	 * @param {string} role - User role
	 * @returns {Array<string>} List of permissions
	 */
	getRolePermissions(role) {
		return Object.entries(this.permissions)
			.filter(([_, roles]) => roles.includes(role))
			.map(([permission]) => permission);
	}
}

module.exports = new Authorization();