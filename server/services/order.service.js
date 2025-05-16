// src/services/order.service.js

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
	 * @param {Object} productRepository - Product repository for stock management
	 * @param {Object} productService - Product service for inventory adjustments
	 * @param {Object} eventDispatcher - Event dispatcher for domain events
	 * @param {Object} logger - Logger instance
	 */
	constructor(
		orderRepository,
		clientRepository,
		productRepository,
		productService,
		eventDispatcher,
		logger
	) {
		this.orderRepository = orderRepository;
		this.clientRepository = clientRepository;
		this.productRepository = productRepository;
		this.productService = productService;
		this.eventDispatcher = eventDispatcher;
		this.logger = logger;
	}

	/**
	 * Create a new order
	 * @param {Object} orderData - Order data
	 * @returns {Promise<Object>} Created order
	 * @throws {Error} Validation or database error
	 */
	async createOrder(orderData) {
		try {
			// Check if client exists
			const clientExists = await this.clientRepository.exists({ _id: orderData.clientId });
			if (!clientExists) {
				throw new Error(`Client with ID ${orderData.clientId} does not exist`);
			}

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
			// Build filter object
			const filterQuery = {};

			if (filters.clientId) {
				filterQuery.clientId = filters.clientId;
			}

			if (filters.status) {
				filterQuery.status = filters.status;
			}

			if (filters.deliveryMethod) {
				filterQuery.deliveryMethod = filters.deliveryMethod;
			}

			if (filters.paymentStatus) {
				filterQuery['paymentDetails.status'] = filters.paymentStatus;
			}

			if (filters.createdAfter) {
				filterQuery.createdAt = { $gte: new Date(filters.createdAfter) };
			}

			if (filters.createdBefore) {
				filterQuery.createdAt = {
					...filterQuery.createdAt,
					$lte: new Date(filters.createdBefore)
				};
			}

			if (filters.minTotal !== undefined) {
				filterQuery.total = { $gte: filters.minTotal };
			}

			if (filters.maxTotal !== undefined) {
				filterQuery.total = {
					...filterQuery.total,
					$lte: filters.maxTotal
				};
			}

			// Set up pagination options
			const queryOptions = {
				sort: options.sort || { createdAt: -1 },
				skip: options.page > 0 ? (options.page - 1) * (options.limit || 10) : 0,
				limit: options.limit || 10
			};

			// Get data
			const [orders, total] = await Promise.all([
				this.orderRepository.find(filterQuery, queryOptions),
				this.orderRepository.count(filterQuery)
			]);

			return {
				data: orders,
				pagination: {
					total,
					page: options.page || 1,
					limit: options.limit || 10,
					pages: Math.ceil(total / (options.limit || 10))
				}
			};
		} catch (error) {
			this.logger.error(`Error fetching orders: ${error.message}`);
			throw error;
		}
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
	 * Update order status
	 * @param {string} orderId - Order ID
	 * @param {string} status - New status
	 * @param {string} note - Optional note
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Not found or database error
	 */
	async updateOrderStatus(orderId, status, note = '') {
		try {
			return await this.orderRepository.withTransaction(async (session) => {
				// Get order with lock
				const order = await this.orderRepository.findOne(
					{ _id: orderId },
					{ session }
				);

				if (!order) {
					throw new Error(`Order with ID ${orderId} not found`);
				}

				// Create domain model
				const Order = require('../domain/models/order.model');
				const orderModel = new Order(order);

				// Update status
				const event = orderModel.updateStatus(status, note);

				// Save to database
				const updatedOrder = await this.orderRepository.update(
					orderId,
					{
						status: orderModel.status,
						statusHistory: orderModel.statusHistory,
						updatedAt: orderModel.updatedAt
					},
					{ session }
				);

				// Dispatch domain event
				if (event) {
					this.eventDispatcher.dispatch('order:status-changed', event);
				}

				// If status is 'completed' or 'cancelled', adjust product inventory
				if (status === 'completed' || status === 'cancelled') {
					await this.handleInventoryAdjustment(order, status, session);
				}

				return updatedOrder;
			});
		} catch (error) {
			this.logger.error(`Error updating order status ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Handle inventory adjustments when order is completed or cancelled
	 * @param {Object} order - Order data
	 * @param {string} status - New status
	 * @param {Object} session - Database session
	 * @private
	 */
	async handleInventoryAdjustment(order, status, session) {
		for (const item of order.items) {
			try {
				// If completed, reduce inventory for real
				// If cancelled, restore inventory
				const quantityAdjustment = status === 'completed' ? item.quantity : -item.quantity;

				if (status === 'completed') {
					await this.productService.adjustStock(item.productId, quantityAdjustment);
				} else if (status === 'cancelled') {
					// Only restore inventory if order was not already completed
					const previouslyCompleted = order.statusHistory.some(
						(history) => history.status === 'completed'
					);

					if (!previouslyCompleted) {
						await this.productService.adjustStock(item.productId, quantityAdjustment);
					}
				}
			} catch (error) {
				this.logger.error(
					`Error adjusting inventory for product ${item.productId}: ${error.message}`
				);
			}
		}
	}

	/**
	 * Add item to an order
	 * @param {string} orderId - Order ID
	 * @param {Object} itemData - Item data
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Not found or database error
	 */
	async addOrderItem(orderId, itemData) {
		try {
			return await this.orderRepository.withTransaction(async (session) => {
				// Get order with lock
				const order = await this.orderRepository.findOne(
					{ _id: orderId },
					{ session }
				);

				if (!order) {
					throw new Error(`Order with ID ${orderId} not found`);
				}

				// Check product availability and stock
				const product = await this.productRepository.findById(itemData.productId);

				if (!product) {
					throw new Error(`Product with ID ${itemData.productId} not found`);
				}

				if (!product.isAvailable) {
					throw new Error(`Product ${product.name} is not available`);
				}

				if (product.stockQuantity < itemData.quantity) {
					throw new Error(`Insufficient stock for product ${product.name}`);
				}

				// Create domain model
				const Order = require('../domain/models/order.model');
				const orderModel = new Order(order);

				// Add item to order
				const itemId = orderModel.addItem({
					productId: product.id,
					name: product.name,
					price: itemData.variant ? product.variants[itemData.variant] : product.price,
					quantity: itemData.quantity,
					variant: itemData.variant || null,
					notes: itemData.notes || ''
				});

				// Save to database
				const updatedOrder = await this.orderRepository.update(
					orderId,
					{
						items: orderModel.items,
						subtotal: orderModel.subtotal,
						total: orderModel.total,
						updatedAt: orderModel.updatedAt
					},
					{ session }
				);

				return { ...updatedOrder, addedItemId: itemId };
			});
		} catch (error) {
			this.logger.error(`Error adding item to order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Remove item from an order
	 * @param {string} orderId - Order ID
	 * @param {string} itemId - Item ID
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Not found or database error
	 */
	async removeOrderItem(orderId, itemId) {
		try {
			return await this.orderRepository.withTransaction(async (session) => {
				// Get order with lock
				const order = await this.orderRepository.findOne(
					{ _id: orderId },
					{ session }
				);

				if (!order) {
					throw new Error(`Order with ID ${orderId} not found`);
				}

				// Create domain model
				const Order = require('../domain/models/order.model');
				const orderModel = new Order(order);

				// Remove item
				const removed = orderModel.removeItem(itemId);

				if (!removed) {
					throw new Error(`Item with ID ${itemId} not found in order`);
				}

				// Save to database
				const updatedOrder = await this.orderRepository.update(
					orderId,
					{
						items: orderModel.items,
						subtotal: orderModel.subtotal,
						total: orderModel.total,
						updatedAt: orderModel.updatedAt
					},
					{ session }
				);

				return updatedOrder;
			});
		} catch (error) {
			this.logger.error(`Error removing item from order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Update order item quantity
	 * @param {string} orderId - Order ID
	 * @param {string} itemId - Item ID
	 * @param {number} quantity - New quantity
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Not found or database error
	 */
	async updateOrderItemQuantity(orderId, itemId, quantity) {
		try {
			return await this.orderRepository.withTransaction(async (session) => {
				// Get order with lock
				const order = await this.orderRepository.findOne(
					{ _id: orderId },
					{ session }
				);

				if (!order) {
					throw new Error(`Order with ID ${orderId} not found`);
				}

				// Find the item
				const item = order.items.find(i => i.id === itemId);
				if (!item) {
					throw new Error(`Item with ID ${itemId} not found in order`);
				}

				// Check stock if increasing quantity
				if (quantity > item.quantity) {
					const product = await this.productRepository.findById(item.productId);

					if (!product) {
						throw new Error(`Product with ID ${item.productId} not found`);
					}

					const additionalQuantity = quantity - item.quantity;
					if (product.stockQuantity < additionalQuantity) {
						throw new Error(`Insufficient stock for product ${product.name}`);
					}
				}

				// Create domain model
				const Order = require('../domain/models/order.model');
				const orderModel = new Order(order);

				// Update quantity
				const updated = orderModel.updateItemQuantity(itemId, quantity);

				if (!updated) {
					throw new Error(`Failed to update item quantity`);
				}

				// Save to database
				const updatedOrder = await this.orderRepository.update(
					orderId,
					{
						items: orderModel.items,
						subtotal: orderModel.subtotal,
						total: orderModel.total,
						updatedAt: orderModel.updatedAt
					},
					{ session }
				);

				return updatedOrder;
			});
		} catch (error) {
			this.logger.error(`Error updating item quantity in order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Set delivery method and address
	 * @param {string} orderId - Order ID
	 * @param {string} method - Delivery method
	 * @param {Object} address - Delivery address
	 * @param {number} fee - Delivery fee
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Not found or database error
	 */
	async setDeliveryMethod(orderId, method, address = null, fee = 0) {
		try {
			// Verify order exists
			const existingOrder = await this.orderRepository.findById(orderId);
			if (!existingOrder) {
				throw new Error(`Order with ID ${orderId} not found`);
			}

			// Create domain model
			const Order = require('../domain/models/order.model');
			const orderModel = new Order(existingOrder);

			// Set delivery method
			orderModel.setDeliveryMethod(method, address, fee);

			// Save to database
			const updatedOrder = await this.orderRepository.update(orderId, {
				deliveryMethod: orderModel.deliveryMethod,
				deliveryAddress: orderModel.deliveryAddress,
				deliveryFee: orderModel.deliveryFee,
				total: orderModel.total,
				updatedAt: orderModel.updatedAt
			});

			return updatedOrder;
		} catch (error) {
			this.logger.error(`Error setting delivery method for order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Apply discount to an order
	 * @param {string} orderId - Order ID
	 * @param {number} amount - Discount amount
	 * @param {string} reason - Discount reason
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Not found or database error
	 */
	async applyDiscount(orderId, amount, reason = '') {
		try {
			// Verify order exists
			const existingOrder = await this.orderRepository.findById(orderId);
			if (!existingOrder) {
				throw new Error(`Order with ID ${orderId} not found`);
			}

			// Create domain model
			const Order = require('../domain/models/order.model');
			const orderModel = new Order(existingOrder);

			// Apply discount
			orderModel.applyDiscount(amount, reason);

			// Save to database
			const updatedOrder = await this.orderRepository.update(orderId, {
				discount: orderModel.discount,
				total: orderModel.total,
				notes: orderModel.notes,
				updatedAt: orderModel.updatedAt
			});

			return updatedOrder;
		} catch (error) {
			this.logger.error(`Error applying discount to order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Update payment details
	 * @param {string} orderId - Order ID
	 * @param {Object} paymentDetails - Payment details
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Not found or database error
	 */
	async updatePayment(orderId, paymentDetails) {
		try {
			return await this.orderRepository.withTransaction(async (session) => {
				// Get order with lock
				const order = await this.orderRepository.findOne(
					{ _id: orderId },
					{ session }
				);

				if (!order) {
					throw new Error(`Order with ID ${orderId} not found`);
				}

				// Create domain model
				const Order = require('../domain/models/order.model');
				const orderModel = new Order(order);

				// Update payment
				orderModel.updatePayment(paymentDetails);

				// Save to database
				const updatedOrder = await this.orderRepository.update(
					orderId,
					{
						paymentDetails: orderModel.paymentDetails,
						status: orderModel.status,
						statusHistory: orderModel.statusHistory,
						updatedAt: orderModel.updatedAt
					},
					{ session }
				);

				// Dispatch payment event
				this.eventDispatcher.dispatch('order:payment-updated', {
					orderId: order.id,
					clientId: order.clientId,
					paymentStatus: paymentDetails.status,
					amount: order.total,
					timestamp: new Date()
				});

				return updatedOrder;
			});
		} catch (error) {
			this.logger.error(`Error updating payment for order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Add a note to an order
	 * @param {string} orderId - Order ID
	 * @param {string} note - Note content
	 * @param {string} author - Note author
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Not found or database error
	 */
	async addNote(orderId, note, author = 'system') {
		try {
			// Verify order exists
			const existingOrder = await this.orderRepository.findById(orderId);
			if (!existingOrder) {
				throw new Error(`Order with ID ${orderId} not found`);
			}

			// Create domain model
			const Order = require('../domain/models/order.model');
			const orderModel = new Order(existingOrder);

			// Add note
			orderModel.addNote(note, author);

			// Save to database
			const updatedOrder = await this.orderRepository.update(orderId, {
				notes: orderModel.notes,
				updatedAt: orderModel.updatedAt
			});

			return updatedOrder;
		} catch (error) {
			this.logger.error(`Error adding note to order ${orderId}: ${error.message}`);
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
			// Verify client exists
			const clientExists = await this.clientRepository.exists({ _id: clientId });
			if (!clientExists) {
				throw new Error(`Client with ID ${clientId} does not exist`);
			}

			return this.getOrders({ clientId }, options);
		} catch (error) {
			this.logger.error(`Error fetching orders for client ${clientId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get orders by status
	 * @param {string} status - Order status
	 * @param {Object} options - Query options
	 * @returns {Promise<Object>} Paginated orders
	 * @throws {Error} Database error
	 */
	async getOrdersByStatus(status, options = {}) {
		try {
			return this.getOrders({ status }, options);
		} catch (error) {
			this.logger.error(`Error fetching orders with status ${status}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get orders summary statistics
	 * @param {Object} filters - Filter criteria
	 * @returns {Promise<Object>} Order statistics
	 * @throws {Error} Database error
	 */
	async getOrdersStats(filters = {}) {
		try {
			// Build filter query
			const filterQuery = {};

			if (filters.startDate) {
				filterQuery.createdAt = { $gte: new Date(filters.startDate) };
			}

			if (filters.endDate) {
				filterQuery.createdAt = {
					...filterQuery.createdAt,
					$lte: new Date(filters.endDate)
				};
			}

			if (filters.status) {
				filterQuery.status = filters.status;
			}

			// Run aggregation
			const stats = await this.orderRepository.aggregate([
				{ $match: filterQuery },
				{ $group: {
						_id: null,
						totalOrders: { $sum: 1 },
						totalSales: { $sum: '$total' },
						avgOrderValue: { $avg: '$total' },
						minOrderValue: { $min: '$total' },
						maxOrderValue: { $max: '$total' }
					}}
			]);

			// Get counts by status
			const statusCounts = await this.orderRepository.aggregate([
				{ $match: filterQuery },
				{ $group: {
						_id: '$status',
						count: { $sum: 1 }
					}},
				{ $sort: { count: -1 } }
			]);

			return {
				summary: stats[0] || {
					totalOrders: 0,
					totalSales: 0,
					avgOrderValue: 0,
					minOrderValue: 0,
					maxOrderValue: 0
				},
				statusBreakdown: statusCounts.reduce((acc, curr) => {
					acc[curr._id] = curr.count;
					return acc;
				}, {})
			};
		} catch (error) {
			this.logger.error(`Error calculating order statistics: ${error.message}`);
			throw error;
		}
	}
}

module.exports = OrderService;