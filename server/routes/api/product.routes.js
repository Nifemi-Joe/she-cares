// src/api/routes/product.routes.js

/**
 * @description Product API routes
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */

const express = require('express');
const multer = require('multer');
const path = require('path');

// Import middleware
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

// Configure file uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, '../../..', 'uploads/products'));
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
		const ext = path.extname(file.originalname);
		cb(null, `product-${uniqueSuffix}${ext}`);
	}
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
	fileFilter: (req, file, cb) => {
		// Accept images only
		if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
			return cb(new Error('Only image files are allowed!'), false);
		}
		cb(null, true);
	}
});

module.exports = (app, productController) => {
	const router = express.Router();

	// Base product routes
	router.get('/', productController.getProducts.bind(productController));
	router.get('/low-stock', authMiddleware.verifyToken, productController.getLowStockProducts.bind(productController));
	router.get('/:id', productController.getProductById.bind(productController));
	router.post(
		'/',
		authMiddleware.verifyToken,
		upload.array('images', 5),
		validationMiddleware.validateProduct,
		productController.createProduct.bind(productController)
	);
	router.put(
		'/:id',
		authMiddleware.verifyToken,
		upload.array('images', 5),
		validationMiddleware.validateProductUpdate,
		productController.updateProduct.bind(productController)
	);
	router.delete(
		'/:id',
		authMiddleware.verifyToken,
		productController.deleteProduct.bind(productController)
	);

	// Stock management
	router.post(
		'/:id/stock',
		authMiddleware.verifyToken,
		validationMiddleware.validateStockAdjustment,
		productController.adjustStock.bind(productController)
	);

	// Availability management
	router.patch(
		'/:id/availability',
		authMiddleware.verifyToken,
		productController.setAvailability.bind(productController)
	);

	// Variant management
	router.post(
		'/:id/variants',
		authMiddleware.verifyToken,
		validationMiddleware.validateVariant,
		productController.addVariant.bind(productController)
	);
	router.delete(
		'/:id/variants/:variantKey',
		authMiddleware.verifyToken,
		productController.removeVariant.bind(productController)
	);

	app.use('/api/products', router);
};