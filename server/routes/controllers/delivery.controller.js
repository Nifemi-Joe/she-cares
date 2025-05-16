// src/api/controllers/delivery.controller.js

const deliveryService = require('../../services/delivery.service');
const { ValidationError } = require('../../utils/error-handler');

/**
 * @class DeliveryController
 * @description Controller handling delivery-related HTTP requests
 * @since v1.1.0 (2023)
 * @author SheCares Development Team
 */
class DeliveryController {
	/**
	 * Create a new delivery
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async createDelivery(req, res, next) {
		try {
			const deliveryData = req.body;
			const delivery = await deliveryService.createDelivery(deliveryData);
			res.status(201).json({
				success: true,
				data: delivery
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get all deliveries
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getAllDeliveries(req, res, next) {
		try {
			const options = {
				page: parseInt(req.query.page, 10) || 1,
				limit: parseInt(req.query.limit, 10) || 10,
				sort: req.query.sort || '-createdAt',
				status: req.query.status,
				fromDate: req.query.fromDate,
				toDate: req.query.toDate,
				clientId: req.query.clientId
			};

			const deliveries = await deliveryService.getAllDeliveries(options);
			res.status(200).json({
				success: true,
				data: deliveries
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get delivery by ID
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getDeliveryById(req, res, next) {
		try {
			const { id } = req.params;
			const delivery = await deliveryService.getDeliveryById(id);
			res.status(200).json({
				success: true,
				data: delivery
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Update delivery
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updateDelivery(req, res, next) {
		try {
			const { id } = req.params;
			const updateData = req.body;
			const updatedDelivery = await deliveryService.updateDelivery(id, updateData);
			res.status(200).json({
				success: true,
				data: updatedDelivery
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Update delivery status
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updateDeliveryStatus(req, res, next) {
		try {
			const { id } = req.params;
			const { status } = req.body;

			if (!status) {
				throw new ValidationError('Status is required');
			}

			const updatedDelivery = await deliveryService.updateDeliveryStatus(id, status);
			res.status(200).json({
				success: true,
				data: updatedDelivery
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Delete delivery
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async deleteDelivery(req, res, next) {
		try {
			const { id } = req.params;
			await deliveryService.deleteDelivery(id);
			res.status(200).json({
				success: true,
				message: 'Delivery deleted successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get deliveries by order
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getDeliveriesByOrder(req, res, next) {
		try {
			const { orderId } = req.params;
			const deliveries = await deliveryService.getDeliveriesByOrderId(orderId);
			res.status(200).json({
				success: true,
				data: deliveries
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get deliveries by client
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getDeliveriesByClient(req, res, next) {
		try {
			const { clientId } = req.params;
			const options = {
				page: parseInt(req.query.page, 10) || 1,
				limit: parseInt(req.query.limit, 10) || 10,
				sort: req.query.sort || '-createdAt',
				status: req.query.status
			};

			const deliveries = await deliveryService.getDeliveriesByClientId(clientId, options);
			res.status(200).json({
				success: true,
				data: deliveries
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Assign driver to delivery
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async assignDriver(req, res, next) {
		try {
			const { id } = req.params;
			const { driverId, driverName, driverPhone } = req.body;

			if (!driverId && (!driverName || !driverPhone)) {
				throw new ValidationError('Either driver ID or driver name/phone is required');
			}

			const updatedDelivery = await deliveryService.assignDriver(id, {
				driverId,
				driverName,
				driverPhone
			});

			res.status(200).json({
				success: true,
				data: updatedDelivery
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Record delivery attempt
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async recordDeliveryAttempt(req, res, next) {
		try {
			const { id } = req.params;
			const attemptData = req.body;

			if (!attemptData.status) {
				throw new ValidationError('Attempt status is required');
			}

			const updatedDelivery = await deliveryService.recordDeliveryAttempt(id, attemptData);
			res.status(200).json({
				success: true,
				data: updatedDelivery
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Mark delivery as completed
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async completeDelivery(req, res, next) {
		try {
			const { id } = req.params;
			const completionData = req.body || {};

			const updatedDelivery = await deliveryService.completeDelivery(id, completionData);
			res.status(200).json({
				success: true,
				data: updatedDelivery
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Calculate delivery fee
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async calculateDeliveryFee(req, res, next) {
		try {
			const deliveryData = req.body;

			if (!deliveryData.location || !deliveryData.items) {
				throw new ValidationError('Location and items are required');
			}

			const fee = await deliveryService.calculateDeliveryFee(deliveryData);
			res.status(200).json({
				success: true,
				data: { fee }
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get pending deliveries dashboard
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getPendingDeliveriesDashboard(req, res, next) {
		try {
			const options = {
				date: req.query.date,
				groupBy: req.query.groupBy || 'location'
			};

			const dashboard = await deliveryService.getPendingDeliveriesDashboard(options);
			res.status(200).json({
				success: true,
				data: dashboard
			});
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new DeliveryController();