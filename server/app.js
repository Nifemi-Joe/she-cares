// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');

// Import configurations
const appConfig = require('./config/app.config');

// Import middleware
const {errorHandler, notFoundHandler} = require('./routes/middleware/error-handler.middleware');
const loggerMiddleware = require('./routes/middleware/logger.middleware');

// Import API routes
const authRoutes = require('./routes/api/auth.routes');
const productRoutes = require('./routes/api/product.routes');
const categoryRoutes = require('./routes/api/category.routes');
const clientRoutes = require('./routes/api/client.routes');
const orderRoutes = require('./routes/api/order.routes');
const invoiceRoutes = require('./routes/api/invoice.routes');
const deliveryRoutes = require('./routes/api/delivery.routes');

// Database connection
const { connectToDatabase } = require('./infrastructure/database/connection');

/**
 * Initialize Express application with middleware and routes
 * @returns {Object} Express application instance
 */
const initializeApp = async () => {
	// Create Express application
	const app = express();

	// Connect to database
	await connectToDatabase();
	console.log('✅ Database connection established');

	// Apply middleware
	app.use(helmet()); // Security headers
	app.use(cors(appConfig.cors)); // CORS configuration
	app.use(compression()); // Response compression
	app.use(express.json({ limit: '10mb' })); // Parse JSON requests
	app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded requests
	app.use(cookieParser()); // Parse cookies

	// Request logging
	if (appConfig.env !== 'test') {
		app.use(morgan(appConfig.env === 'development' ? 'dev' : 'combined'));
	}

	// Custom logger middleware
	// app.use(loggerMiddleware);

	// Serve static files (if any)
	if (appConfig.serveStaticFiles) {
		app.use('/static', express.static(path.join(__dirname, '../public')));
	}

	// API Routes
	app.use('/api/auth', authRoutes);
	app.use('/api/products', productRoutes);
	app.use('/api/categories', categoryRoutes);
	app.use('/api/clients', clientRoutes);
	app.use('/api/orders', orderRoutes);
	app.use('/api/invoices', invoiceRoutes);
	app.use('/api/deliveries', deliveryRoutes);

	// Health check endpoint
	app.get('/health', (req, res) => {
		res.status(200).json({
			status: 'ok',
			version: appConfig.version,
			timestamp: new Date().toISOString()
		});
	});

	// Root API information
	app.get('/api', (req, res) => {
		res.status(200).json({
			name: 'SheCares API',
			version: appConfig.version,
			description: 'E-commerce backend API for SheCares platform',
			documentation: appConfig.docsUrl || '/api-docs'
		});
	});

	// // API Documentation
	// if (appConfig.env !== 'production' || appConfig.enableApiDocs) {
	// 	const swaggerUi = require('swagger-ui-express');
	// 	const swaggerDocument = require('../swagger.json');
	// 	app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
	// }

	// Handle 404 - Not Found
	app.use((req, res, next) => {
		res.status(404).json({
			status: 'error',
			message: 'Resource not found',
			path: req.originalUrl
		});
	});

	// Global error handler
	app.use(errorHandler);

	return app;
};

module.exports = { initializeApp };