// src/api/routes/auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const userValidator = require('../../domain/validators/user.validator');

/**
 * @api {post} /api/auth/register Register new user
 * @apiName RegisterUser
 * @apiGroup Authentication
 * @apiPermission admin
 */
router.post(
	'/register',
	verifyToken,
	requireAdmin,
	validate(userValidator.registerSchema),
	authController.register
);

/**
 * @api {post} /api/auth/login Login user
 * @apiName LoginUser
 * @apiGroup Authentication
 * @apiPermission public
 */
router.post(
	'/login',
	validate(userValidator.loginSchema),
	authController.login
);

/**
 * @api {get} /api/auth/profile Get user profile
 * @apiName GetProfile
 * @apiGroup Authentication
 * @apiPermission authenticated
 */
router.get(
	'/profile',
	verifyToken,
	authController.getProfile
);

/**
 * @api {put} /api/auth/profile Update user profile
 * @apiName UpdateProfile
 * @apiGroup Authentication
 * @apiPermission authenticated
 */
router.put(
	'/profile',
	verifyToken,
	validate(userValidator.updateProfileSchema),
	authController.updateProfile
);

/**
 * @api {post} /api/auth/change-password Change password
 * @apiName ChangePassword
 * @apiGroup Authentication
 * @apiPermission authenticated
 */
router.post(
	'/change-password',
	verifyToken,
	validate(userValidator.changePasswordSchema),
	authController.changePassword
);

/**
 * @api {get} /api/auth/users Get all users
 * @apiName GetAllUsers
 * @apiGroup Authentication
 * @apiPermission admin
 */
router.get(
	'/users',
	verifyToken,
	requireAdmin,
	authController.getAllUsers
);

/**
 * @api {patch} /api/auth/users/:userId/status Set user status
 * @apiName SetUserStatus
 * @apiGroup Authentication
 * @apiPermission admin
 */
router.patch(
	'/users/:userId/status',
	verifyToken,
	requireAdmin,
	authController.setUserStatus
);

module.exports = router;