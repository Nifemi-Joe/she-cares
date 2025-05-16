// src/data/repositories/user.repository.js

const BaseRepository = require('./base.repository');
const UserSchema = require('../schemas/user.schema');
const User = require('../../domain/models/user.model');
const { DatabaseError } = require('../../utils/error-handler');

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
		super('users', UserSchema);
	}

	/**
	 * Find user by email
	 * @param {string} email - User email
	 * @returns {Promise<User|null>} User or null if not found
	 */
	async findByEmail(email) {
		try {
			const user = await this.collection.findOne({ email });
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
			const user = await this.collection.findOne({ phoneNumber });
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
			const users = await this.collection.find({ isActive: true }).toArray();
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
			const users = await this.collection.find({ role }).toArray();
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
			id: dbObject._id.toString(),
			fullName: dbObject.fullName,
			email: dbObject.email,
			password: dbObject.password,
			role: dbObject.role,
			isActive: dbObject.isActive,
			phoneNumber: dbObject.phoneNumber,
			preferences: dbObject.preferences,
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