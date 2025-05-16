// src/api/routes/category.routes.js

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const categoryValidator = require('../../domain/validators/category.validator');

/**
 * @route POST /api/categories
 * @desc Create a new category
 * @access Private/Admin
 */
router.post('/',
	verifyToken,
	requireAdmin,
	validate(categoryValidator.validateCreate),
	categoryController.createCategory
);

/**
 * @route GET /api/categories
 * @desc Get all categories
 * @access Public
 */
router.get('/',
	categoryController.getAllCategories
);

/**
 * @route GET /api/categories/:id
 * @desc Get category by ID
 * @access Public
 */
router.get('/:id',
	categoryController.getCategoryById
);

/**
 * @route PUT /api/categories/:id
 * @desc Update category
 * @access Private/Admin
 */
router.put('/:id',
	verifyToken,
	requireAdmin,
	validate(categoryValidator.validateUpdate),
	categoryController.updateCategory
);

/**
 * @route DELETE /api/categories/:id
 * @desc Delete category
 * @access Private/Admin
 */
router.delete('/:id',
	verifyToken,
	requireAdmin,
	categoryController.deleteCategory
);

/**
 * @route GET /api/categories/:id/products
 * @desc Get products by category
 * @access Public
 */
router.get('/:id/products',
	categoryController.getProductsByCategory
);

module.exports = router;