// src/api/middlewares/auth.middleware.js

const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError, AuthenticationError } = require('../../utils/error-handler');
const config = require('../../config/security.config');
const userRepository = require('../../data/repositories/user.repository');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
	try {
		// Get token from Authorization header
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new UnauthorizedError('Authentication required');
		}

		const token = authHeader.split(' ')[1];
		if (!token) {
			throw new UnauthorizedError('Authentication token is required');
		}

		// Verify token
		const decoded = jwt.verify(token, config.jwtSecret);

		// Check if user exists
		const user = await userRepository.findById(decoded.id);
		if (!user) {
			throw new UnauthorizedError('Invalid authentication token');
		}

		// Check if user is active
		if (!user.isActive) {
			throw new UnauthorizedError('User account is deactivated');
		}

		// Attach user to request
		req.user = {
			id: user.id,
			email: user.email,
			role: user.role,
			fullName: user.fullName
		};

		next();
	} catch (error) {
		if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
			next(new UnauthorizedError('Invalid or expired token'));
		} else {
			next(error);
		}
	}
};

/**
 * Role-based authorization middleware
 * @param {string|Array} roles - Required role(s)
 */
const authorize = (roles) => {
	return (req, res, next) => {
		try {
			if (!req.user) {
				throw new UnauthorizedError('Authentication required');
			}

			// Convert single role to array
			const allowedRoles = Array.isArray(roles) ? roles : [roles];

			// Check if user has required role
			if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
				throw new ForbiddenError('Insufficient permissions');
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

const verifyToken = async (req, res, next) => {
	try {
		// Get token from header
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new AuthenticationError('No token provided');
		}

		const token = authHeader.split(' ')[1];

		// Verify token
		const decoded = jwt.verify(token, config.jwtSecret);

		// Check if user exists and is active
		const user = await userRepository.findById(decoded.id);
		if (!user) {
			throw new AuthenticationError('User not found');
		}

		if (!user.isActive) {
			throw new AuthenticationError('User account is deactivated');
		}

		// Add user to request object
		req.user = {
			id: user.id,
			email: user.email,
			role: user.role
		};

		next();
	} catch (error) {
		if (error.name === 'JsonWebTokenError') {
			next(new AuthenticationError('Invalid token'));
		} else if (error.name === 'TokenExpiredError') {
			next(new AuthenticationError('Token expired'));
		} else {
			next(error);
		}
	}
};

/**
 * Middleware to ensure user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = (req, res, next) => {
	if (!req.user) {
		return next(new AuthenticationError('Authentication required'));
	}

	if (req.user.role !== 'admin') {
		return next(new ForbiddenError('Admin access required'));
	}

	next();
};

/**
 * Middleware to ensure user has staff role or higher
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireStaff = (req, res, next) => {
	if (!req.user) {
		return next(new AuthenticationError('Authentication required'));
	}

	if (!['admin', 'staff'].includes(req.user.role)) {
		return next(new ForbiddenError('Staff access required'));
	}

	next();
};

/**
 * Middleware factory to check if user has required permissions
 * @param {Array} requiredPermissions - Array of required permissions
 * @returns {Function} Express middleware
 */
const requirePermissions = (requiredPermissions) => {
	return async (req, res, next) => {
		try {
			if (!req.user) {
				throw new AuthenticationError('Authentication required');
			}

			// Fetch detailed user with permissions from database
			const user = await userRepository.findById(req.user.id);

			// Admins have all permissions
			if (user.role === 'admin') {
				return next();
			}

			// Check user permissions
			const userPermissions = user.permissions || [];
			const hasAllPermissions = requiredPermissions.every(permission =>
				userPermissions.includes(permission)
			);

			if (!hasAllPermissions) {
				throw new ForbiddenError('Insufficient permissions');
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

/**
 * Middleware to check if user has access to a specific resource
 * @param {Function} getResourceOwnerId - Function to extract resource owner ID
 * @returns {Function} Express middleware
 */
const requireResourceAccess = (getResourceOwnerId) => {
	return async (req, res, next) => {
		try {
			if (!req.user) {
				throw new AuthenticationError('Authentication required');
			}

			// Admins have access to all resources
			if (req.user.role === 'admin') {
				return next();
			}

			const resourceOwnerId = await getResourceOwnerId(req);

			// Check if user owns the resource
			if (resourceOwnerId && resourceOwnerId === req.user.id) {
				return next();
			}

			throw new ForbiddenError('Access denied');
		} catch (error) {
			next(error);
		}
	};
};

module.exports = {
	authenticate,
	authorize,
	verifyToken,
	requireAdmin,
	requireStaff,
	requirePermissions,
	requireResourceAccess
};