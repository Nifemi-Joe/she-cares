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
	 * Get order statistics (basic)
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getOrderStats(req, res, next) {
		try {
			// Basic stats - you'll need to implement this in OrderService
			const stats = {
				totalOrders: 0,
				pendingOrders: 0,
				completedOrders: 0,
				totalRevenue: 0
			};

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
			// Enhanced stats - you'll need to implement this in OrderService
			const stats = {
				overview: {
					totalOrders: 0,
					totalRevenue: 0,
					averageOrderValue: 0,
					pendingOrders: 0
				},
				trends: {
					ordersThisMonth: 0,
					revenueThisMonth: 0,
					growthRate: 0
				}
			};

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
	 * Get recent orders
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 * @param {Function} next - Express next middleware function
	 */
	async getRecentOrders(req, res, next) {
		try {
			const limit = parseInt(req.query.limit, 10) || 10;
			const orders = await orderService.getOrders({}, {
				limit,
				sort: { createdAt: -1 }
			});

			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: orders.data
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

			// Mock sales data - implement actual logic in OrderService
			const salesData = {
				period,
				data: [],
				totalSales: 0,
				totalOrders: 0
			};

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

			// Mock invoice generation - implement actual invoice service
			const invoice = {
				orderId: id,
				invoiceNumber: `INV-${Date.now()}`,
				generatedAt: new Date(),
				order: order
			};

			res.status(200).json({
				responseCode: "00",
				responseMessage: "Completed Successfully",
				responseData: invoice
			});
		} catch (error) {
			next(error);
		}
	}
}

module.exports = new OrderController();