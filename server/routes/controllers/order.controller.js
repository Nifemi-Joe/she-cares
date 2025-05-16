// src/api/controllers/order.controller.js

const orderService = require('../../services/order.service');
const { ValidationError } = require('../../utils/error-handler');

/**
 * @class OrderController
 * @description Controller handling order-related HTTP requests
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class OrderController {
	/**
	 * Create a new order
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async createOrder(req, res, next) {
		try {
			const orderData = req.body;
			const order = await orderService.createOrder(orderData);
			res.status(201).json({
				success: true,
				data: order
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get all orders
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getAllOrders(req, res, next) {
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

			const orders = await orderService.getAllOrders(options);
			res.status(200).json({
				success: true,
				data: orders
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get order by ID
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getOrderById(req, res, next) {
		try {
			const { id } = req.params;
			const order = await orderService.getOrderById(id);
			res.status(200).json({
				success: true,
				data: order
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Update order
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updateOrder(req, res, next) {
		try {
			const { id } = req.params;
			const updateData = req.body;
			const updatedOrder = await orderService.updateOrder(id, updateData);
			res.status(200).json({
				success: true,
				data: updatedOrder
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Update order status
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updateOrderStatus(req, res, next) {
		try {
			const { id } = req.params;
			const { status } = req.body;

			if (!status) {
				throw new ValidationError('Status is required');
			}

			const updatedOrder = await orderService.updateOrderStatus(id, status);
			res.status(200).json({
				success: true,
				data: updatedOrder
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Delete order
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async deleteOrder(req, res, next) {
		try {
			const { id } = req.params;
			await orderService.deleteOrder(id);
			res.status(200).json({
				success: true,
				message: 'Order deleted successfully'
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get orders by client
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getOrdersByClient(req, res, next) {
		try {
			const { clientId } = req.params;
			const options = {
				page: parseInt(req.query.page, 10) || 1,
				limit: parseInt(req.query.limit, 10) || 10,
				sort: req.query.sort || '-createdAt'
			};

			const orders = await orderService.getOrdersByClientId(clientId, options);
			res.status(200).json({
				success: true,
				data: orders
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get order statistics
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getOrderStats(req, res, next) {
		try {
			const options = {
				fromDate: req.query.fromDate,
				toDate: req.query.toDate
			};

			const stats = await orderService.getOrderStats(options);
			res.status(200).json({
				success: true,
				data: stats
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Add item to order
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async addOrderItem(req, res, next) {
		try {
			const { id } = req.params;
			const itemData = req.body;

			if (!itemData.productId || !itemData.quantity) {
				throw new ValidationError('Product ID and quantity are required');
			}

			const updatedOrder = await orderService.addOrderItem(id, itemData);
			res.status(200).json({
				success: true,
				data: updatedOrder
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Update order item
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updateOrderItem(req, res, next) {
		try {
			const { id, itemId } = req.params;
			const updateData = req.body;

			const updatedOrder = await orderService.updateOrderItem(id, itemId, updateData);
			res.status(200).json({
				success: true,
				data: updatedOrder
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Remove order item
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async removeOrderItem(req, res, next) {
		try {
			const { id, itemId } = req.params;
			const updatedOrder = await orderService.removeOrderItem(id, itemId);
			res.status(200).json({
				success: true,
				data: updatedOrder
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Generate invoice for order
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async generateInvoice(req, res, next) {
		try {
			const { id } = req.params;
			const invoiceData = req.body || {};

			const invoice = await orderService.generateInvoice(id, invoiceData);
			res.status(201).json({
				success: true,
				data: invoice
			});
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new OrderController();