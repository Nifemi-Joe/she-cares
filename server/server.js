// src/server.js

const http = require('http');
const { initializeApp } = require('./app');
const appConfig = require('./config/app.config');
const logger = require('./infrastructure/logging/logger');

/**
 * Normalize port value
 * @param {string|number} val - Port value
 * @returns {number|string|boolean} Normalized port
 */
const normalizePort = (val) => {
	const port = parseInt(val, 10);

	if (isNaN(port)) {
		// Named pipe
		return val;
	}

	if (port >= 0) {
		// Port number
		return port;
	}

	return false;
};

/**
 * Event listener for HTTP server "error" event
 * @param {Error} error - Error object
 */
const onError = (error) => {
	if (error.syscall !== 'listen') {
		throw error;
	}

	const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

	// Handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			logger.error(`${bind} requires elevated privileges`);
			process.exit(1);
			break;
		case 'EADDRINUSE':
			logger.error(`${bind} is already in use`);
			process.exit(1);
			break;
		default:
			throw error;
	}
};

/**
 * Event listener for HTTP server "listening" event
 */
const onListening = () => {
	const addr = server.address();
	const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
	logger.info(`🚀 Server listening on ${bind} in ${appConfig.env} mode`);

	if (appConfig.env === 'development') {
		logger.info(`API docs available at http://localhost:${port}/api-docs`);
	}
};

/**
 * Handle graceful shutdown
 */
const gracefulShutdown = () => {
	logger.info('🔄 Received termination signal. Shutting down gracefully...');

	server.close(() => {
		logger.info('✅ HTTP server closed');

		// Close database connections and other resources
		// MongoDB connection will be closed automatically

		process.exit(0);
	});

	// Force close after timeout
	setTimeout(() => {
		logger.error('❌ Could not close connections in time, forcefully shutting down');
		process.exit(1);
	}, 10000);
};

// Get port from configuration
const port = normalizePort(appConfig.port || '7009');

// Initialize the app and start the server
let server;

const startServer = async () => {
	try {
		// Initialize Express app
		const app = await initializeApp();

		// Set port
		app.set('port', port);

		// Create HTTP server
		server = http.createServer(app);

		// Listen on port
		server.listen(port);
		server.on('error', onError);
		server.on('listening', onListening);

		// Handle graceful shutdown
		process.on('SIGTERM', gracefulShutdown);
		process.on('SIGINT', gracefulShutdown);

	} catch (error) {
		logger.error('❌ Failed to start server:', error);
		process.exit(1);
	}
};

// Start server if this file is run directly
if (require.main === module) {
	startServer();
}

module.exports = { startServer };