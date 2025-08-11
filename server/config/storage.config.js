// src/config/storage.config.js

/**
 * Storage configuration
 * @module config/storage
 * @description File storage settings
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

const path = require('path');
const env = process.env.NODE_ENV;

/**
 * Local storage configuration
 */
const localStorageConfig = {
	development: {
		rootDir: process.env.LOCAL_STORAGE_ROOT,
		baseUrl: process.env.LOCAL_STORAGE_URL,
		maxFileSize: 5 * 1024 * 1024, // 5MB
		permissions: 0o755
	},
	test: {
		rootDir: process.env.LOCAL_STORAGE_ROOT,
		baseUrl: process.env.LOCAL_STORAGE_URL,
		maxFileSize: 5 * 1024 * 1024, // 5MB
		permissions: 0o755
	},
	production: {
		rootDir: process.env.LOCAL_STORAGE_ROOT,
		baseUrl: process.env.LOCAL_STORAGE_URL,
		maxFileSize: 10 * 1024 * 1024, // 10MB
		permissions: 0o644
	}
};

/**
 * Cloud storage configuration (AWS S3 or compatible)
 */
const cloudStorageConfig = {
	enabled: process.env.CLOUD_STORAGE_ENABLED === 'true',
	provider: process.env.CLOUD_STORAGE_PROVIDER,
	region: process.env.CLOUD_STORAGE_REGION,
	credentials: {
		accessKeyId: process.env.CLOUD_STORAGE_ACCESS_KEY,
		secretAccessKey: process.env.CLOUD_STORAGE_SECRET_KEY
	},
	bucket: process.env.CLOUD_STORAGE_BUCKET,
	endPoint: process.env.CLOUD_STORAGE_ENDPOINT,
	baseUrl: process.env.CLOUD_STORAGE_BASE_URL,
	maxFileSize: 10 * 1024 * 1024 // 10MB
};

/**
 * File types and storage paths configuration
 */
const fileTypesConfig = {
	products: {
		path: 'products',
		allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
		maxFileSize: 2 * 1024 * 1024, // 2MB
		imageProcessing: {
			resize: true,
			quality: 80,
			formats: ['webp', 'jpeg'],
			dimensions: [
				{ width: 800, height: 800, suffix: 'large' },
				{ width: 400, height: 400, suffix: 'medium' },
				{ width: 200, height: 200, suffix: 'thumbnail' }
			]
		}
	},
	categories: {
		path: 'categories',
		allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
		maxFileSize: 1 * 1024 * 1024, // 1MB
		imageProcessing: {
			resize: true,
			quality: 80,
			formats: ['webp', 'jpeg'],
			dimensions: [
				{ width: 400, height: 400, suffix: 'large' },
				{ width: 200, height: 200, suffix: 'medium' },
				{ width: 100, height: 100, suffix: 'thumbnail' }
			]
		}
	},
	invoices: {
		path: 'invoices',
		allowedTypes: ['application/pdf'],
		maxFileSize: 5 * 1024 * 1024 // 5MB
	},
	users: {
		path: 'users',
		allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
		maxFileSize: 1 * 1024 * 1024, // 1MB
		imageProcessing: {
			resize: true,
			quality: 85,
			formats: ['webp', 'jpeg'],
			dimensions: [
				{ width: 300, height: 300, suffix: 'large' },
				{ width: 150, height: 150, suffix: 'medium' },
				{ width: 50, height: 50, suffix: 'thumbnail' }
			]
		}
	},
	backups: {
		path: 'backups',
		allowedTypes: ['application/x-gzip', 'application/zip', 'application/x-tar'],
		maxFileSize: 100 * 1024 * 1024 // 100MB
	}
};

module.exports = {
	localStorage: localStorageConfig[env],
	cloudStorage: cloudStorageConfig,
	fileTypes: fileTypesConfig,
	// Determine which storage to use (local or cloud)
	useCloudStorage: cloudStorageConfig.enabled && env === 'production'
};