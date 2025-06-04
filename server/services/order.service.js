// src/services/order.service.js
const { logger } = require('../infrastructure/logging/logger');

/**
 * @class OrderService
 * @description Service layer for order operations
 * @since v1.0.0 (2015)
 * @author SheCares Development Team
 */
class OrderService {
	/**
	 * Create a new OrderService instance
	 * @param {Object} orderRepository - Order repository instance
	 * @param {Object} clientRepository - Client repository for validation
	 * @param {Object} userRepository - User repository for validation
	 * @param {Object} productRepository - Product repository for stock management
	 * @param {Object} productService - Product service for inventory adjustments
	 * @param {Object} eventDispatcher - Event dispatcher for domain events
	 * @param {Object} logger - Logger instance
	 */
	constructor(
		orderRepository,
		clientRepository,
		userRepository,
		productRepository,
		productService,
		eventDispatcher,
		logger
	) {
		this.orderRepository = orderRepository;
		this.clientRepository = clientRepository;
		this.userRepository = userRepository;
		this.productRepository = productRepository;
		this.productService = productService;
		this.eventDispatcher = eventDispatcher;
		this.logger = logger;
	}

	/**
	 * Validate if client exists in either User or Client schema
	 * @param {string} clientId - Client ID to validate
	 * @returns {Promise<boolean>} True if client exists
	 * @throws {Error} Client not found error
	 * @private
	 */
	async validateClientExists(clientId) {
		try {
			// Check if client exists in Client schema
			const clientExists = await this.clientRepository.exists({ _id: clientId });

			if (clientExists) {
				return true;
			}

			// If not found in Client schema, check User schema
			const userExists = await this.userRepository.exists({ _id: clientId });

			if (userExists) {
				return true;
			}

			// If not found in either schema, throw error
			throw new Error(`Client with ID ${clientId} does not exist`);
		} catch (error) {
			if (error.message.includes('does not exist')) {
				throw error;
			}
			// If it's a database error, log it and rethrow
			this.logger.error(`Error validating client ${clientId}: ${error.message}`);
			throw new Error(`Error validating client: ${error.message}`);
		}
	}

	/**
	 * Create a new order
	 * @param {Object} orderData - Order data
	 * @returns {Promise<Object>} Created order
	 * @throws {Error} Validation or database error
	 */
	async createOrder(orderData) {
		try {
			// Check if client exists in both User and Client schemas
			await this.validateClientExists(orderData.clientId);

			// Create order ID if not provided
			if (!orderData.id) {
				orderData.id = `order_${Date.now()}`;
			}

			// Validate products and calculate initial totals
			await this.validateOrderItems(orderData.items);

			// Create order domain model
			const Order = require('../domain/models/order.model');
			const order = new Order(orderData);

			// Recalculate totals to ensure accuracy
			order.recalculateTotals();

			// Save to database
			const savedOrder = await this.orderRepository.create(order.toJSON());

			// Dispatch event
			this.eventDispatcher.dispatch('order:created', {
				orderId: savedOrder.id,
				clientId: savedOrder.clientId,
				total: savedOrder.total,
				timestamp: new Date()
			});

			return savedOrder;
		} catch (error) {
			this.logger.error(`Error creating order: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Validate order items and check stock availability
	 * @param {Array} items - Order items
	 * @throws {Error} Validation error
	 * @private
	 */
	async validateOrderItems(items) {
		if (!items || !items.length) {
			throw new Error('Order must contain at least one item');
		}

		// Check each product
		for (const item of items) {
			const product = await this.productRepository.findById(item.productId);

			if (!product) {
				throw new Error(`Product with ID ${item.productId} does not exist`);
			}

			if (!product.isAvailable) {
				throw new Error(`Product "${product.name}" is not available`);
			}

			// Check stock
			if (product.stockQuantity < item.quantity) {
				throw new Error(`Insufficient stock for product "${product.name}": requested ${item.quantity}, available ${product.stockQuantity}`);
			}

			// Validate variant if specified
			if (item.variant && !product.variants[item.variant]) {
				throw new Error(`Variant "${item.variant}" does not exist for product "${product.name}"`);
			}
		}
	}

	/**
	 * Get order by ID
	 * @param {string} orderId - Order ID
	 * @returns {Promise<Object>} Order data
	 * @throws {Error} Not found or database error
	 */
	async getOrderById(orderId) {
		try {
			const order = await this.orderRepository.findById(orderId);

			if (!order) {
				throw new Error(`Order with ID ${orderId} not found`);
			}

			return order;
		} catch (error) {
			this.logger.error(`Error fetching order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get all orders with filtering and pagination
	 * @param {Object} filters - Filter criteria
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Paginated orders
	 * @throws {Error} Database error
	 */
	async getOrders(filters = {}, options = {}) {
		try {
			// Convert our filters to the format expected by the repository
			const repositoryOptions = {
				page: options.page || 1,
				limit: options.limit || 10,
				sort: options.sort ? this._convertSortObjectToString(options.sort) : '-createdAt',
				status: filters.status,
				clientId: filters.clientId,
				fromDate: filters.createdAfter,
				toDate: filters.createdBefore
			};

			// Additional filters that may need special handling
			if (filters.deliveryMethod || filters.paymentStatus ||
				filters.minTotal !== undefined || filters.maxTotal !== undefined) {
				this.logger.warn(
					'Some advanced filters are not supported by the repository layer directly. ' +
					'Consider extending OrderRepository.getOrders to support these filters.'
				);
			}

			// Use the repository's getOrders method instead of trying to use find directly
			return await this.orderRepository.getOrders(repositoryOptions);
		} catch (error) {
			this.logger.error(`Error fetching orders: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Helper method to convert sort object to string format
	 * @param {Object} sortObj - Sort object (e.g., { createdAt: -1, name: 1 })
	 * @returns {string} Sort string (e.g., '-createdAt,+name')
	 * @private
	 */
	_convertSortObjectToString(sortObj) {
		if (typeof sortObj === 'string') return sortObj;

		return Object.entries(sortObj)
			.map(([key, value]) => {
				if (value === -1 || value === 'desc' || value === 'DESC') {
					return `-${key}`;
				}
				return `+${key}`;
			})
			.join(',');
	}

	/**
	 * Update an order
	 * @param {string} orderId - Order ID
	 * @param {Object} updateData - Updated order data
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Not found or database error
	 */
	async updateOrder(orderId, updateData) {
		try {
			// Verify order exists
			const existingOrder = await this.orderRepository.findById(orderId);
			if (!existingOrder) {
				throw new Error(`Order with ID ${orderId} not found`);
			}

			// Prevent changing client
			if (updateData.clientId && updateData.clientId !== existingOrder.clientId) {
				throw new Error('Cannot change order client');
			}

			// Update timestamp
			updateData.updatedAt = new Date();

			// Update order
			const updatedOrder = await this.orderRepository.update(orderId, updateData);

			// Dispatch event
			this.eventDispatcher.dispatch('order:updated', {
				orderId: updatedOrder.id,
				updatedFields: Object.keys(updateData),
				timestamp: new Date()
			});

			return updatedOrder;
		} catch (error) {
			this.logger.error(`Error updating order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get orders by client ID
	 * @param {string} clientId - Client ID
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Paginated orders
	 * @throws {Error} Database error
	 */
	async getClientOrders(clientId, options = {}) {
		try {
			// Verify client exists in both User and Client schemas
			await this.validateClientExists(clientId);

			return this.getOrders({ clientId }, options);
		} catch (error) {
			this.logger.error(`Error fetching orders for client ${clientId}: ${error.message}`);
			throw error;
		}
	}

	// ... rest of the methods remain the same as in your original code
	// (updateOrderStatus, handleInventoryAdjustment, addOrderItem, removeOrderItem,
	//  updateOrderItemQuantity, setDeliveryMethod, applyDiscount, updatePayment,
	//  addNote, getOrdersByStatus, getOrdersStats, getStats, getRecentOrders, getSalesData)
}
module.exports = OrderService;