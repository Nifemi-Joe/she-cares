// src/infrastructure/storage/file-storage.js

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../../config/storage.config');
const { logger } = require('../logging/logger');

/**
 * @class FileStorage
 * @description Service for handling file storage operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class FileStorage {
	constructor() {
		this.basePath = config.storagePath || path.join(process.cwd(), 'uploads');
		this.ensureStorageDirectoryExists();
	}

	/**
	 * Ensure storage directory exists
	 * @private
	 */
	async ensureStorageDirectoryExists() {
		try {
			await fs.mkdir(this.basePath, { recursive: true });
			logger.info(`Storage directory ensured at ${this.basePath}`);
		} catch (error) {
			logger.error(`Error creating storage directory: ${error.message}`);
			throw new Error(`Failed to create storage directory: ${error.message}`);
		}
	}

	/**
	 * Save a file to storage
	 * @param {Buffer|string} fileData - File data buffer or base64 string
	 * @param {string} filename - Original filename
	 * @param {string} type - File type/category (e.g., 'products', 'invoices')
	 * @returns {Object} Stored file information
	 */
	async saveFile(fileData, filename, type = 'general') {
		try {
			// Create type directory if it doesn't exist
			const typeDir = path.join(this.basePath, type);
			await fs.mkdir(typeDir, { recursive: true });

			// Generate unique filename
			const fileExtension = path.extname(filename);
			const fileBasename = path.basename(filename, fileExtension);
			const safeBasename = fileBasename.replace(/[^a-zA-Z0-9]/g, '-');
			const uniqueId = crypto.randomBytes(8).toString('hex');
			const uniqueFilename = `${safeBasename}-${uniqueId}${fileExtension}`;
			const filePath = path.join(typeDir, uniqueFilename);

			// Convert base64 to buffer if necessary
			let dataBuffer = fileData;
			if (typeof fileData === 'string' && fileData.includes('base64,')) {
				dataBuffer = Buffer.from(fileData.split('base64,')[1], 'base64');
			} else if (typeof fileData === 'string') {
				dataBuffer = Buffer.from(fileData);
			}

			// Write file
			await fs.writeFile(filePath, dataBuffer);

			// Return file info
			const fileUrl = `/${type}/${uniqueFilename}`;
			return {
				filename: uniqueFilename,
				originalName: filename,
				path: filePath,
				url: fileUrl,
				type,
				size: dataBuffer.length,
				createdAt: new Date()
			};
		} catch (error) {
			logger.error(`Error saving file ${filename}: ${error.message}`);
			throw new Error(`Failed to save file: ${error.message}`);
		}
	}

	/**
	 * Get a file by its URL or path
	 * @param {string} fileUrl - File URL or path
	 * @returns {Buffer} File data
	 */
	async getFile(fileUrl) {
		try {
			// Convert URL format to file path
			let filePath = fileUrl;
			if (fileUrl.startsWith('/')) {
				// Remove leading slash and join with base path
				filePath = path.join(this.basePath, fileUrl.substring(1));
			} else if (!path.isAbsolute(fileUrl)) {
				filePath = path.join(this.basePath, fileUrl);
			}

			// Read and return file
			return await fs.readFile(filePath);
		} catch (error) {
			logger.error(`Error retrieving file ${fileUrl}: ${error.message}`);
			throw new Error(`Failed to retrieve file: ${error.message}`);
		}
	}

	/**
	 * Delete a file
	 * @param {string} fileUrl - File URL or path
	 * @returns {boolean} Whether file was deleted
	 */
	async deleteFile(fileUrl) {
		try {
			// Convert URL format to file path
			let filePath = fileUrl;
			if (fileUrl.startsWith('/')) {
				// Remove leading slash and join with base path
				filePath = path.join(this.basePath, fileUrl.substring(1));
			} else if (!path.isAbsolute(fileUrl)) {
				filePath = path.join(this.basePath, fileUrl);
			}

			// Delete file
			await fs.unlink(filePath);
			logger.info(`File deleted: ${filePath}`);
			return true;
		} catch (error) {
			logger.error(`Error deleting file ${fileUrl}: ${error.message}`);
			if (error.code === 'ENOENT') {
				// File doesn't exist
				return false;
			}
			throw new Error(`Failed to delete file: ${error.message}`);
		}
	}

	/**
	 * List files in a directory
	 * @param {string} type - Directory/type to list
	 * @returns {Array} List of files
	 */
	async listFiles(type = 'general') {
		try {
			const typeDir = path.join(this.basePath, type);

			// Check if directory exists
			try {
				await fs.access(typeDir);
			} catch (error) {
				if (error.code === 'ENOENT') {
					// Directory doesn't exist
					return [];
				}
				throw error;
			}

			// Read directory
			const files = await fs.readdir(typeDir);

			// Get file stats
			const fileDetails = await Promise.all(
				files.map(async (filename) => {
					const filePath = path.join(typeDir, filename);
					const stats = await fs.stat(filePath);
					return {
						filename,
						path: filePath,
						url: `/${type}/${filename}`,
						type,
						size: stats.size,
						createdAt: stats.birthtime,
						modifiedAt: stats.mtime
					};
				})
			);

			return fileDetails;
		} catch (error) {
			logger.error(`Error listing files in ${type}: ${error.message}`);
			throw new Error(`Failed to list files: ${error.message}`);
		}
	}
}

module.exports = new FileStorage();