/**
 * @description Product API routes
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const productController = require('../controllers/product.controller');

// Middleware imports
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
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
	fileFilter: (req, file, cb) => {
		if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
			return cb(new Error('Only image files are allowed!'), false);
		}
		cb(null, true);
	}
});

// Public Routes
// Get all products (with filtering and pagination) - MUST be first
router.get('/', (req, res, next) => productController.getProducts(req, res, next));

// Protected Routes - Analytics/Statistics (BEFORE /:id route)
// Get product statistics (Protected)
router.get('/stats',
	authMiddleware.verifyToken,
	(req, res, next) => productController.getStats(req, res, next)
);

// Get top products (Protected)
router.get('/analytics/top',
	authMiddleware.verifyToken,
	(req, res, next) => productController.getTopProducts(req, res, next)
);

// Get low stock products (Protected)
router.get('/analytics/low-stock',
	authMiddleware.verifyToken,
	(req, res, next) => productController.getLowStockProducts(req, res, next)
);

// Protected Routes - CRUD Operations
// Create product (Protected, with images)
router.post('/',
	authMiddleware.verifyToken,
	upload.array('images', 5),
	(req, res, next) => productController.createProduct(req, res, next)
);

// Get product by ID - MUST come AFTER specific routes like /stats
router.get('/:id', (req, res, next) => productController.getProductById(req, res, next));

// Update product (Protected, with images)
router.put('/:id',
	authMiddleware.verifyToken,
	// upload.array('images', 5),
	// validationMiddleware.validateObjectId,
	(req, res, next) => productController.updateProduct(req, res, next)
);

// Delete product (Protected)
router.delete('/:id',
	authMiddleware.verifyToken,
	validationMiddleware.validateObjectId,
	(req, res, next) => productController.deleteProduct(req, res, next)
);

// Protected Routes - Stock Management
// Adjust stock (Protected)
router.post('/:id/stock',
	authMiddleware.verifyToken,
	validationMiddleware.validateObjectId,
	(req, res, next) => productController.adjustStock(req, res, next)
);

// Set availability (Protected)
router.patch('/:id/availability',
	authMiddleware.verifyToken,
	validationMiddleware.validateObjectId,
	(req, res, next) => productController.setAvailability(req, res, next)
);

// Protected Routes - Variant Management
// Add variant (Protected)
router.post('/:id/variants',
	authMiddleware.verifyToken,
	validationMiddleware.validateObjectId,
	(req, res, next) => productController.addVariant(req, res, next)
);

// Remove variant (Protected)
router.delete('/:id/variants/:variantKey',
	authMiddleware.verifyToken,
	validationMiddleware.validateObjectId,
	(req, res, next) => productController.removeVariant(req, res, next)
);

module.exports = router;