// src/api/controllers/order.controller.js

const { logger } = require('../../infrastructure/logging/logger');
const OrderRepository = require('../../data/repositories/order.repository');
const ClientRepository = require('../../data/repositories/client.repository');
const UserRepository = require('../../data/repositories/user.repository');
const ProductRepository = require('../../data/repositories/product.repository');
const ProductService = require('../../services/product.service');
const EventDispatcher = require('../../domain/events/event-dispatcher');
const OrderService = require("../../services/order.service");

// Import repositories (already instantiated)
const orderRepository = OrderRepository;
const clientRepository = ClientRepository;
const userRepository = UserRepository;
const productRepository = ProductRepository;
const eventDispatcher = EventDispatcher;

// Create services
const productService = new ProductService(productRepository, logger);
const orderService = new OrderService(
	orderRepository,
	clientRepository,
	userRepository,
	productRepository,
	productService,
	eventDispatcher,
	logger
);

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
			console.log(orderData);
			const order = await orderService.createOrder(orderData);
			res.status(201).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
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
			// Build filters object
			const filters = {
				status: req.query.status,
				clientId: req.query.clientId,
				createdAfter: req.query.fromDate,
				createdBefore: req.query.toDate,
				deliveryMethod: req.query.deliveryMethod,
				paymentStatus: req.query.paymentStatus,
				minTotal: req.query.minTotal ? parseFloat(req.query.minTotal) : undefined,
				maxTotal: req.query.maxTotal ? parseFloat(req.query.maxTotal) : undefined
			};

			// Build options object
			const options = {
				page: parseInt(req.query.page, 10) || 1,
				limit: parseInt(req.query.limit, 10) || 10,
				sort: req.query.sort || { createdAt: -1 }
			};

			const orders = await orderService.getOrders(filters, options);
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: orders
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
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
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
				sort: req.query.sort || { createdAt: -1 }
			};

			const orders = await orderService.getClientOrders(clientId, options);
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: orders
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
			const order = await orderService.updateOrder(id, updateData);
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Delete order (only pending orders)
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async deleteOrder(req, res, next) {
		try {
			const { id } = req.params;
			await orderService.deleteOrder(id);
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Order deleted successfully",
				responseData: { deleted: true }
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Cancel order
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async cancelOrder(req, res, next) {
		try {
			const { id } = req.params;
			const { reason } = req.body;
			const order = await orderService.cancelOrder(id, reason);
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Order cancelled successfully",
				responseData: order
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get order statistics (basic)
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getOrderStats(req, res, next) {
		try {
			const filters = {
				fromDate: req.query.fromDate,
				toDate: req.query.toDate
			};

			const stats = await orderService.getOrderStats(filters);
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: stats
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get enhanced order statistics for dashboard
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getStats(req, res, next) {
		try {
			const filters = {
				fromDate: req.query.fromDate,
				toDate: req.query.toDate
			};

			const stats = await orderService.getOrderStats(filters);

			// Calculate additional metrics
			const currentMonth = new Date();
			currentMonth.setDate(1);
			const monthlyStats = await orderService.getOrderStats({
				fromDate: currentMonth
			});

			const enhancedStats = {
				overview: {
					totalOrders: stats.overall.totalOrders,
					totalRevenue: stats.overall.totalRevenue,
					averageOrderValue: stats.overall.averageOrderValue,
					pendingOrders: stats.byStatus.pending?.count || 0
				},
				trends: {
					ordersThisMonth: monthlyStats.overall.totalOrders,
					revenueThisMonth: monthlyStats.overall.totalRevenue,
					growthRate: 0 // You can calculate this based on previous period
				},
				statusBreakdown: stats.byStatus
			};

			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: enhancedStats
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get recent orders
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getRecentOrders(req, res, next) {
		try {
			const limit = parseInt(req.query.limit, 10) || 10;
			const orders = await orderService.getRecentOrders(limit);

			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: orders
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get sales data for charts
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getSalesData(req, res, next) {
		try {
			const { period = '30d' } = req.query;
			const salesData = await orderService.getSalesData(period);

			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: salesData
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Get orders by status
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getOrdersByStatus(req, res, next) {
		try {
			const { status } = req.params;
			const options = {
				page: parseInt(req.query.page, 10) || 1,
				limit: parseInt(req.query.limit, 10) || 10,
				sort: req.query.sort || { createdAt: -1 }
			};

			const orders = await orderService.getOrders({ status }, options);
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: orders
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

			const order = await orderService.updateOrder(id, { status });
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Set delivery method and address
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async setDeliveryMethod(req, res, next) {
		try {
			const { id } = req.params;
			const deliveryData = req.body;

			const order = await orderService.updateOrder(id, {
				deliveryMethod: deliveryData.method,
				deliveryAddress: deliveryData.address,
				deliveryInstructions: deliveryData.instructions
			});

			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Apply discount to order
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async applyDiscount(req, res, next) {
		try {
			const { id } = req.params;
			const { discount } = req.body;

			const order = await orderService.updateOrder(id, { discount });
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Update payment details
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async updatePayment(req, res, next) {
		try {
			const { id } = req.params;
			const paymentData = req.body;

			const order = await orderService.updateOrder(id, {
				paymentMethod: paymentData.method,
				paymentStatus: paymentData.status,
				paymentReference: paymentData.reference
			});

			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Add note to order
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async addNote(req, res, next) {
		try {
			const { id } = req.params;
			const { note } = req.body;

			// Get existing order first
			const existingOrder = await orderService.getOrderById(id);
			const notes = existingOrder.notes || [];
			notes.push({
				text: note,
				timestamp: new Date(),
				author: req.user?.id || 'system'
			});

			const order = await orderService.updateOrder(id, { notes });
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
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

			// Get existing order first
			const existingOrder = await orderService.getOrderById(id);
			const items = existingOrder.items || [];
			items.push(itemData);

			const order = await orderService.updateOrder(id, { items });
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
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

			// Get existing order first
			const existingOrder = await orderService.getOrderById(id);
			const items = existingOrder.items || [];
			const itemIndex = items.findIndex(item => item.id === itemId);

			if (itemIndex === -1) {
				return res.status(404).json({
					responseCode: "01",
					responseMessage: "Order item not found"
				});
			}

			items[itemIndex] = { ...items[itemIndex], ...updateData };
			const order = await orderService.updateOrder(id, { items });

			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Remove item from order
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async removeOrderItem(req, res, next) {
		try {
			const { id, itemId } = req.params;

			// Get existing order first
			const existingOrder = await orderService.getOrderById(id);
			const items = existingOrder.items || [];
			const filteredItems = items.filter(item => item.id !== itemId);

			const order = await orderService.updateOrder(id, { items: filteredItems });
			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: order
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
			const order = await orderService.getOrderById(id);
			const clientInfo = await orderService.getClientInfo(order.clientId);

			// Generate invoice using the service method
			const invoice = await orderService.createOrderInvoice(order, clientInfo);

			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: invoice
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Bulk update orders
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async bulkUpdateOrders(req, res, next) {
		try {
			const { orderIds, updateData } = req.body;
			const results = [];

			for (const orderId of orderIds) {
				try {
					const order = await orderService.updateOrder(orderId, updateData);
					results.push({ orderId, success: true, order });
				} catch (error) {
					results.push({ orderId, success: false, error: error.message });
				}
			}

			res.status(200).json({
				responseCode: "00",
				responseMessage: "Bulk update completed",
				responseData: results
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Export orders to CSV
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async exportOrders(req, res, next) {
		try {
			const filters = {
				status: req.query.status,
				fromDate: req.query.fromDate,
				toDate: req.query.toDate
			};

			const orders = await orderService.getOrders(filters, {
				limit: 10000, // Large limit for export
				page: 1
			});

			// Convert to CSV format
			const csvData = this._convertOrdersToCSV(orders.data);

			res.setHeader('Content-Type', 'text/csv');
			res.setHeader('Content-Disposition', 'attachment; filename="orders_export.csv"');
			res.status(200).send(csvData);
		} catch (error) {
			next(error);
		}
	}

	/**
	 * Convert orders to CSV format
	 * @param {Array} orders - Orders data
	 * @returns {string} CSV formatted string
	 * @private
	 */
	_convertOrdersToCSV(orders) {
		const headers = [
			'Order ID',
			'Order Number',
			'Client ID',
			'Status',
			'Total Amount',
			'Delivery Method',
			'Payment Status',
			'Created At',
			'Updated At'
		];

		const rows = orders.map(order => [
			order.id || order._id,
			order.orderNumber,
			order.clientId,
			order.status,
			order.totalAmount || order.total,
			order.deliveryMethod,
			order.paymentStatus,
			new Date(order.createdAt).toISOString(),
			new Date(order.updatedAt).toISOString()
		]);

		return [headers, ...rows]
			.map(row => row.map(cell => `"${cell}"`).join(','))
			.join('\n');
	}
}

module.exports = new OrderController();