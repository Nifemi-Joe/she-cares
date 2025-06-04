// src/data/repositories/user.repository.js

const BaseRepository = require('./base.repository');
const User = require('../../domain/models/user.model');
const { DatabaseError } = require('../../utils/error-handler');

// Import the actual Mongoose model, not the schema
const UserModel = require('../../data/schemas/user.schema'); // Adjust this path to your actual User model

/**
 * @class UserRepository
 * @extends BaseRepository
 * @description Repository for user data operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class UserRepository extends BaseRepository {
	/**
	 * Initialize user repository
	 */
	constructor() {
		// Use the actual Mongoose model, not the schema
		super(UserModel, console);
	}

	/**
	 * Find user by ID - Override to handle the specific case
	 * @param {string} id - User ID
	 * @param {Object} options - Query options
	 * @returns {Promise<Object|null>} User or null if not found
	 */
	async findById(id, options = {}) {
		try {
			// Call parent method first
			const user = await super.findById(id, options);

			if (!user) {
				return null;
			}

			// Return the raw database object for middleware compatibility
			return {
				_id: user._id || user.id,
				id: user._id ? user._id.toString() : user.id,
				name: user.name || user.fullName,
				fullName: user.name || user.fullName,
				email: user.email,
				password: user.password,
				role: user.role,
				isActive: user.isActive,
				phoneNumber: user.phoneNumber,
				preferences: user.preferences,
				permissions: user.permissions || [],
				lastLogin: user.lastLogin,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				__v: user.__v
			};
		} catch (error) {
			this.logger.error(`Error finding user by ID ${id}: ${error.message}`);
			throw new DatabaseError(`Error finding user by ID: ${error.message}`);
		}
	}

	/**
	 * Find user by email
	 * @param {string} email - User email
	 * @returns {Promise<User|null>} User or null if not found
	 */
	async findByEmail(email) {
		try {
			// Use the findOne method from BaseRepository
			const user = await this.findOne({ email });
			return user ? this._toModel(user) : null;
		} catch (error) {
			throw new DatabaseError(`Error finding user by email: ${error.message}`);
		}
	}

	/**
	 * Find user by phone number
	 * @param {string} phoneNumber - User phone number
	 * @returns {Promise<User|null>} User or null if not found
	 */
	async findByPhone(phoneNumber) {
		try {
			// Use the findOne method from BaseRepository
			const user = await this.findOne({ phoneNumber });
			return user ? this._toModel(user) : null;
		} catch (error) {
			throw new DatabaseError(`Error finding user by phone: ${error.message}`);
		}
	}

	/**
	 * Find active users
	 * @returns {Promise<Array<User>>} List of active users
	 */
	async findActiveUsers() {
		try {
			// Use the find method from BaseRepository
			const users = await this.find({ isActive: true });
			return users.map(user => this._toModel(user));
		} catch (error) {
			throw new DatabaseError(`Error finding active users: ${error.message}`);
		}
	}

	/**
	 * Find users by role
	 * @param {string} role - User role
	 * @returns {Promise<Array<User>>} List of users with specified role
	 */
	async findByRole(role) {
		try {
			// Use the find method from BaseRepository
			const users = await this.find({ role });
			return users.map(user => this._toModel(user));
		} catch (error) {
			throw new DatabaseError(`Error finding users by role: ${error.message}`);
		}
	}

	/**
	 * Convert database object to domain model
	 * @param {Object} dbObject - Database object
	 * @returns {User} User domain model
	 * @protected
	 */
	_toModel(dbObject) {
		return new User({
			id: dbObject._id ? dbObject._id.toString() : dbObject.id,
			fullName: dbObject.name || dbObject.fullName,
			email: dbObject.email,
			password: dbObject.password,
			role: dbObject.role,
			isActive: dbObject.isActive,
			phoneNumber: dbObject.phoneNumber,
			preferences: dbObject.preferences,
			permissions: dbObject.permissions || [],
			lastLogin: dbObject.lastLogin,
			createdAt: dbObject.createdAt,
			updatedAt: dbObject.updatedAt
		});
	}

	/**
	 * Convert domain model to database object
	 * @param {User} model - User domain model
	 * @returns {Object} Database object
	 * @protected
	 */
	_toDbObject(model) {
		const { id, ...dbObject } = model;

		// Don't overwrite _id if it exists in model (for updates)
		if (model._id) {
			dbObject._id = model._id;
		}

		return dbObject;
	}
}

module.exports = new UserRepository();