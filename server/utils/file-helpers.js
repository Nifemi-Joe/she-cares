// src/utils/file-helpers.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * File helper utilities for managing files in the application
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

/**
 * Generate a temporary file path in the OS temporary directory
 * @param {string} prefix - File name prefix
 * @param {string} extension - File extension (without the dot)
 * @returns {string} Full path to the temporary file
 */
function getTempFilePath(prefix = 'tmp', extension = 'tmp') {
	const randomString = crypto.randomBytes(8).toString('hex');
	return path.join(os.tmpdir(), `${prefix}-${randomString}.${extension}`);
}

/**
 * Create directory if it doesn't exist
 * @param {string} directoryPath - Path to directory
 * @returns {Promise<void>}
 */
async function ensureDirectoryExists(directoryPath) {
	try {
		await fs.promises.mkdir(directoryPath, { recursive: true });
	} catch (error) {
		if (error.code !== 'EEXIST') {
			throw error;
		}
	}
}

/**
 * Save buffer to file
 * @param {Buffer} buffer - Data buffer
 * @param {string} filePath - Path where file should be saved
 * @returns {Promise<string>} Path to saved file
 */
async function saveBufferToFile(buffer, filePath) {
	// Ensure directory exists
	const directory = path.dirname(filePath);
	await ensureDirectoryExists(directory);

	// Write buffer to file
	await fs.promises.writeFile(filePath, buffer);
	return filePath;
}

/**
 * Delete file if it exists
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} Whether file was deleted
 */
async function deleteFileIfExists(filePath) {
	try {
		await fs.promises.unlink(filePath);
		return true;
	} catch (error) {
		if (error.code === 'ENOENT') {
			// File doesn't exist, which is fine
			return false;
		}
		throw error;
	}
}

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} Whether file exists
 */
async function fileExists(filePath) {
	try {
		await fs.promises.access(filePath, fs.constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get file size
 * @param {string} filePath - Path to file
 * @returns {Promise<number>} File size in bytes
 */
async function getFileSize(filePath) {
	const stats = await fs.promises.stat(filePath);
	return stats.size;
}

/**
 * Get file extension from path
 * @param {string} filePath - Path to file
 * @returns {string} File extension (without the dot)
 */
function getFileExtension(filePath) {
	return path.extname(filePath).slice(1).toLowerCase();
}

/**
 * Generate a unique filename based on original name
 * @param {string} originalName - Original file name
 * @returns {string} Unique filename
 */
function generateUniqueFilename(originalName) {
	const timestamp = Date.now();
	const random = crypto.randomBytes(4).toString('hex');
	const extension = path.extname(originalName);
	const baseName = path.basename(originalName, extension);

	return `${baseName}-${timestamp}-${random}${extension}`;
}

/**
 * Calculate MD5 hash of a file
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} MD5 hash
 */
async function calculateFileHash(filePath) {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash('md5');
		const stream = fs.createReadStream(filePath);

		stream.on('error', err => reject(err));
		stream.on('data', chunk => hash.update(chunk));
		stream.on('end', () => resolve(hash.digest('hex')));
	});
}

/**
 * Read file as text
 * @param {string} filePath - Path to file
 * @param {string} encoding - File encoding (default: utf8)
 * @returns {Promise<string>} File contents
 */
async function readFileAsText(filePath, encoding = 'utf8') {
	return fs.promises.readFile(filePath, { encoding });
}

/**
 * Read file as buffer
 * @param {string} filePath - Path to file
 * @returns {Promise<Buffer>} File buffer
 */
async function readFileAsBuffer(filePath) {
	return fs.promises.readFile(filePath);
}

module.exports = {
	getTempFilePath,
	ensureDirectoryExists,
	saveBufferToFile,
	deleteFileIfExists,
	fileExists,
	getFileSize,
	getFileExtension,
	generateUniqueFilename,
	calculateFileHash,
	readFileAsText,
	readFileAsBuffer
};