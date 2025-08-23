// src/data/schemas/user.schema.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @schema UserSchema
 * @description Mongoose schema for user data storage
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
const UserSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Full name is required'],
		trim: true
	},
	email: {
		type: String,
		required: [true, 'Email address is required'],
		unique: true,
		lowercase: true,
		trim: true,
		match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
	},
	password: {
		type: String,
		required: [true, 'Password is required'],
		minlength: [6, 'Password must be at least 6 characters long']
	},
	role: {
		type: String,
		enum: ['admin', 'client'],
		default: 'client'
	},
	isActive: {
		type: Boolean,
		default: true
	},
	phoneNumber: {
		type: String,
		trim: true
	},
	preferences: {
		notifications: {
			type: Boolean,
			default: true
		},
		theme: {
			type: String,
			enum: ['light', 'dark'],
			default: 'light'
		}
	},
	lastLogin: {
		type: Date
	},
	passwordResetToken: String,
	passwordResetExpires: Date
}, {
	timestamps: true,
	toJSON: {
		transform: function(doc, ret) {
			delete ret.password;
			delete ret.passwordResetToken;
			delete ret.passwordResetExpires;
			return ret;
		}
	}
});

/**
 * Pre-save hook to hash password
 */

/**
 * Compare provided password with stored hash
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} Whether passwords match
 */
UserSchema.methods.comparePassword = async function(candidatePassword) {
	return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if user is admin
 * @returns {boolean} Whether user is admin
 */
UserSchema.methods.isAdmin = function() {
	return this.role === 'admin';
};

/**
 * Generate password reset token
 * @returns {string} Reset token
 */
UserSchema.methods.createPasswordResetToken = function() {
	// Generate random token
	const resetToken = crypto.randomBytes(32).toString('hex');

	// Hash token and set to schema
	this.passwordResetToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');

	// Set expiration (10 minutes)
	this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

	// Return unhashed token (will be sent to user)
	return resetToken;
};

module.exports = mongoose.model('User', UserSchema);