// src/services/order.service.js
const { logger } = require('../infrastructure/logging/logger');
const EmailService = require('./email.service');
const InvoiceService = require('./invoice.service');

/**
 * @class OrderService
 * @description Service layer for order operations
 * @since v1.0.0 (2023)
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
			const clientExists = await this.clientRepository.exists({_id: clientId});

			if (clientExists) {
				return true;
			}

			// If not found in Client schema, check User schema
			const userExists = await this.userRepository.exists({_id: clientId});

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
	 * Get client information from either User or Client schema
	 * @param {string} clientId - Client ID
	 * @returns {Promise<Object>} Client information
	 * @private
	 */
	async getClientInfo(clientId) {
		try {
			// Try Client schema first
			let client = await this.clientRepository.findById(clientId);

			if (client) {
				return {
					id: client._id,
					name: client.name || client.fullName,
					email: client.email,
					phone: client.phone,
					address: client.address
				};
			}

			// Try User schema
			client = await this.userRepository.findById(clientId);

			if (client) {
				return {
					id: client._id,
					name: client.name || client.fullName,
					email: client.email,
					phone: client.phone,
					address: client.address
				};
			}

			throw new Error(`Client with ID ${clientId} not found`);
		} catch (error) {
			this.logger.error(`Error getting client info ${clientId}: ${error.message}`);
			throw error;
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

			// Generate order number if not provided
			if (!orderData.orderNumber) {
				orderData.orderNumber = await this.generateOrderNumber();
			}

			// Validate products and calculate initial totals
			await this.validateOrderItems(orderData.items);

			// Process order data for delivery fee logic
			const processedOrderData = this.processOrderDataForDelivery(orderData);

			// Create order using repository (let schema handle the pre-save logic)
			const savedOrder = await this.orderRepository.create(processedOrderData);

			// Get client information for emails
			const clientInfo = await this.getClientInfo(savedOrder.clientId);

			// Create invoice for the order (only if total amount is not TBD)
			let invoice = null;
			if (savedOrder.totalAmount !== 'TBD') {
				invoice = await this.createOrderInvoice(savedOrder, clientInfo);

				// Update order with invoice ID
				if (invoice) {
					await this.orderRepository.update(savedOrder._id, { invoiceId: invoice._id });
					savedOrder.invoiceId = invoice._id;
				}
			}

			// Send email notifications
			await this.sendOrderCreatedEmails(savedOrder, clientInfo, invoice);

			// Dispatch event
			this.eventDispatcher.dispatch('order:created', {
				orderId: savedOrder._id,
				clientId: savedOrder.clientId,
				total: savedOrder.totalAmount,
				deliveryFeePending: savedOrder.deliveryFeePending,
				timestamp: new Date()
			});

			return savedOrder;
		} catch (error) {
			this.logger.error(`Error creating order: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Process order data for delivery fee logic
	 * @param {Object} orderData - Raw order data
	 * @returns {Object} Processed order data
	 * @private
	 */
	processOrderDataForDelivery(orderData) {
		const processedData = { ...orderData };

		// Calculate subtotal if not provided
		if (!processedData.subtotal) {
			processedData.subtotal = processedData.items.reduce((sum, item) => {
				return sum + (item.totalPrice || (item.quantity * item.price));
			}, 0);
		}

		// Handle delivery fee logic
		if (processedData.shippingMethod === 'delivery') {
			// For all delivery orders, set delivery fee as pending
			processedData.shippingCost = 'TBD';
			processedData.totalAmount = 'TBD';
			processedData.deliveryFeePending = true;

			// Add appropriate notes
			if (!processedData.deliveryNotes) {
				processedData.deliveryNotes = 'Delivery fee to be calculated per location using third-party service';
			}

			// Add to status history
			if (!processedData.statusHistory) {
				processedData.statusHistory = [];
			}
			processedData.statusHistory.push({
				status: processedData.status || 'pending',
				timestamp: new Date(),
				note: 'Order created - delivery fee pending location calculation'
			});
		} else {
			// For pickup orders
			processedData.shippingCost = 0;
			processedData.deliveryFeePending = false;
			processedData.totalAmount = processedData.subtotal +
				(processedData.taxAmount || 0) -
				(processedData.discountAmount || 0);
			processedData.finalTotalAmount = processedData.totalAmount;
		}

		// Ensure numeric values are set
		processedData.taxAmount = processedData.taxAmount || 0;
		processedData.discountAmount = processedData.discountAmount || 0;

		return processedData;
	}

	/**
	 * Update delivery fee for an order
	 * @param {string} orderId - Order ID
	 * @param {number} deliveryFee - Calculated delivery fee
	 * @param {string} deliveryService - Optional delivery service name
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Validation or database error
	 */
	async updateDeliveryFee(orderId, deliveryFee, deliveryService = null) {
		try {
			// Validate delivery fee
			if (typeof deliveryFee !== 'number' || deliveryFee < 0) {
				throw new Error('Delivery fee must be a non-negative number');
			}

			// Get existing order
			const existingOrder = await this.orderRepository.findById(orderId);
			if (!existingOrder) {
				throw new Error(`Order with ID ${orderId} not found`);
			}

			// Check if delivery fee is pending
			if (!existingOrder.deliveryFeePending) {
				throw new Error('Order delivery fee is not pending calculation');
			}

			// Calculate new totals
			const newTotalAmount = existingOrder.subtotal +
				deliveryFee +
				(existingOrder.taxAmount || 0) -
				(existingOrder.discountAmount || 0);

			// Update order
			const updateData = {
				shippingCost: deliveryFee,
				calculatedDeliveryFee: deliveryFee,
				deliveryFeePending: false,
				totalAmount: newTotalAmount,
				finalTotalAmount: newTotalAmount,
				deliveryService: deliveryService,
				updatedAt: new Date()
			};

			// Add to status history
			const statusNote = deliveryService
				? `Delivery fee updated: ₦${deliveryFee.toLocaleString()} (${deliveryService})`
				: `Delivery fee updated: ₦${deliveryFee.toLocaleString()}`;

			updateData['$push'] = {
				statusHistory: {
					status: existingOrder.status,
					timestamp: new Date(),
					note: statusNote
				}
			};

			const updatedOrder = await this.orderRepository.update(orderId, updateData);

			// Create invoice now that total is finalized
			if (!updatedOrder.invoiceId) {
				const clientInfo = await this.getClientInfo(updatedOrder.clientId);
				const invoice = await this.createOrderInvoice(updatedOrder, clientInfo);

				if (invoice) {
					await this.orderRepository.update(orderId, { invoiceId: invoice._id });
					updatedOrder.invoiceId = invoice._id;

					// Send updated order email with invoice
					await this.sendDeliveryFeeUpdatedEmails(updatedOrder, clientInfo, invoice, deliveryFee, deliveryService);
				}
			}

			// Dispatch event
			this.eventDispatcher.dispatch('order:delivery_fee_updated', {
				orderId: updatedOrder._id,
				deliveryFee,
				deliveryService,
				newTotal: newTotalAmount,
				timestamp: new Date()
			});

			return updatedOrder;
		} catch (error) {
			this.logger.error(`Error updating delivery fee for order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get orders with pending delivery fee calculation
	 * @param {Object} options - Query options
	 * @returns {Promise<Array>} Orders with pending delivery fee
	 * @throws {Error} Database error
	 */
	async getOrdersWithPendingDeliveryFee(options = {}) {
		try {
			const filters = { deliveryFeePending: true };
			return await this.getOrders(filters, options);
		} catch (error) {
			this.logger.error(`Error fetching orders with pending delivery fee: ${error.message}`);
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
			// Clean up filters - remove undefined values
			const cleanFilters = {};
			Object.keys(filters).forEach(key => {
				if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
					cleanFilters[key] = filters[key];
				}
			});

			// Handle search functionality
			if (cleanFilters.search) {
				const searchTerm = cleanFilters.search;
				delete cleanFilters.search;

				// Create search conditions for multiple fields
				cleanFilters.$or = [
					// Search in order number
					{ orderNumber: { $regex: searchTerm, $options: 'i' } },
					// Search in contact info name
					{ 'contactInfo.name': { $regex: searchTerm, $options: 'i' } },
					// Search in contact info email
					{ 'contactInfo.email': { $regex: searchTerm, $options: 'i' } },
					// Search in contact info phone
					{ 'contactInfo.phone': { $regex: searchTerm, $options: 'i' } },
					// Search in item names
					{ 'items.name': { $regex: searchTerm, $options: 'i' } },
					// Search in notes
					{ notes: { $regex: searchTerm, $options: 'i' } },
					// Search in delivery notes
					{ deliveryNotes: { $regex: searchTerm, $options: 'i' } }
				];

				// If search term looks like a client ID (ObjectId format), add client ID search
				if (searchTerm.match(/^[0-9a-fA-F]{24}$/)) {
					cleanFilters.$or.push({ clientId: searchTerm });
				}
			}

			// Handle date range filters
			if (cleanFilters.createdAfter || cleanFilters.createdBefore) {
				cleanFilters.createdAt = {};

				if (cleanFilters.createdAfter) {
					cleanFilters.createdAt.$gte = new Date(cleanFilters.createdAfter);
					delete cleanFilters.createdAfter;
				}

				if (cleanFilters.createdBefore) {
					cleanFilters.createdAt.$lte = new Date(cleanFilters.createdBefore);
					delete cleanFilters.createdBefore;
				}
			}

			// Handle amount range filters (only for non-TBD orders)
			if (cleanFilters.minTotal || cleanFilters.maxTotal) {
				const amountFilter = {};

				if (cleanFilters.minTotal) {
					amountFilter.$gte = cleanFilters.minTotal;
					delete cleanFilters.minTotal;
				}

				if (cleanFilters.maxTotal) {
					amountFilter.$lte = cleanFilters.maxTotal;
					delete cleanFilters.maxTotal;
				}

				// Only apply to numeric total amounts
				if (!cleanFilters.$and) {
					cleanFilters.$and = [];
				}
				cleanFilters.$and.push(
					{ totalAmount: { $type: 'number' } },
					{ totalAmount: amountFilter }
				);
			}

			// Set default options
			const queryOptions = {
				page: options.page || 1,
				limit: options.limit || 10,
				sort: this._convertSortObjectToString(options.sort || { createdAt: -1 })
			};

			// Use repository method
			return await this.orderRepository.getOrders({
				...queryOptions,
				...cleanFilters
			});

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
	 * Generate order number
	 * @returns {Promise<string>} Generated order number
	 * @private
	 */
	async generateOrderNumber() {
		const date = new Date();
		const year = date.getFullYear().toString().slice(-2);
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');

		// Get count of orders today
		const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

		const todayOrdersCount = await this.orderRepository.count({
			createdAt: {
				$gte: startOfDay,
				$lt: endOfDay
			}
		});

		return `ORD-${year}${month}${day}-${(todayOrdersCount + 1).toString().padStart(4, '0')}`;
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
			if (updateData.clientId && updateData.clientId !== existingOrder.clientId.toString()) {
				throw new Error('Cannot change order client');
			}

			// Handle status changes
			if (updateData.status && updateData.status !== existingOrder.status) {
				updateData['$push'] = {
					statusHistory: {
						status: updateData.status,
						timestamp: new Date(),
						note: updateData.statusNote || 'Status updated',
						updatedBy: updateData.updatedBy
					}
				};
				delete updateData.statusNote;
			}

			// Update timestamp
			updateData.updatedAt = new Date();

			// Update order
			const updatedOrder = await this.orderRepository.update(orderId, updateData);

			// Dispatch event
			this.eventDispatcher.dispatch('order:updated', {
				orderId: updatedOrder._id,
				updatedFields: Object.keys(updateData).filter(key => key !== '$push'),
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

	/**
	 * Get order statistics
	 * @param {Object} filters - Optional date filters
	 * @returns {Promise<Object>} Order statistics
	 * @throws {Error} Database error
	 */
	async getOrderStats(filters = {}) {
		try {
			const stats = await this.orderRepository.getOrderStats(filters);

			// Add delivery fee pending stats
			const pendingDeliveryFeeCount = await this.orderRepository.count({
				deliveryFeePending: true,
				...filters
			});

			stats.pendingDeliveryFee = pendingDeliveryFeeCount;

			return stats;
		} catch (error) {
			this.logger.error(`Error getting order statistics: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get recent orders
	 * @param {number} limit - Number of orders to return
	 * @returns {Promise<Array>} Recent orders
	 * @throws {Error} Database error
	 */
	async getRecentOrders(limit = 10) {
		try {
			const result = await this.getOrders({}, {
				limit,
				sort: { createdAt: -1 }
			});
			return result.data;
		} catch (error) {
			this.logger.error(`Error fetching recent orders: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Get sales data for analytics
	 * @param {string} period - Time period (e.g., '30d', '7d', '1y')
	 * @returns {Promise<Object>} Sales data
	 * @throws {Error} Database error
	 */
	async getSalesData(period = '1y') {
		try {
			// Calculate date range based on period
			const endDate = new Date();
			const startDate = new Date();

			switch (period) {
				case '7d':
					startDate.setDate(endDate.getDate() - 7);
					break;
				case '30d':
					startDate.setDate(endDate.getDate() - 30);
					break;
				case '90d':
					startDate.setDate(endDate.getDate() - 90);
					break;
				case '1y':
					startDate.setFullYear(endDate.getFullYear() - 1);
					break;
				default:
					startDate.setDate(endDate.getDate() - 30);
			}

			// Get orders in the specified period (exclude TBD amounts)
			const orders = await this.getOrders({
				createdAfter: startDate,
				createdBefore: endDate
			}, {
				limit: 1000, // Large limit to get all orders
				sort: { createdAt: 1 }
			});

			// Filter out orders with TBD amounts for sales calculations
			const completedOrders = orders.data.filter(order =>
				typeof order.totalAmount === 'number' && !order.deliveryFeePending
			);

			// Process data for charts
			const salesData = this._processSalesDataForChart(completedOrders, period);

			return {
				period,
				data: salesData,
				totalSales: completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
				totalOrders: orders.data.length,
				completedOrders: completedOrders.length,
				pendingDeliveryFeeOrders: orders.data.filter(order => order.deliveryFeePending).length
			};

		} catch (error) {
			this.logger.error(`Error getting sales data: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Process sales data for chart visualization
	 * @param {Array} orders - Orders data
	 * @param {string} period - Time period
	 * @returns {Array} Processed chart data
	 * @private
	 */
	_processSalesDataForChart(orders, period) {
		const groupBy = period === '7d' ? 'day' : period === '30d' ? 'day' : 'month';
		const dataMap = new Map();

		orders.forEach(order => {
			const date = new Date(order.createdAt);
			let key;

			if (groupBy === 'day') {
				key = date.toISOString().split('T')[0]; // YYYY-MM-DD
			} else {
				key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
			}

			if (!dataMap.has(key)) {
				dataMap.set(key, { date: key, sales: 0, orders: 0 });
			}

			const data = dataMap.get(key);
			data.sales += order.totalAmount || 0;
			data.orders += 1;
		});

		return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
	}

	/**
	 * Delete an order
	 * @param {string} orderId - Order ID
	 * @returns {Promise<boolean>} Success status
	 * @throws {Error} Not found or database error
	 */
	async deleteOrder(orderId) {
		try {
			// Verify order exists
			const existingOrder = await this.orderRepository.findById(orderId);
			if (!existingOrder) {
				throw new Error(`Order with ID ${orderId} not found`);
			}

			// Only allow deletion of pending orders
			if (existingOrder.status !== 'pending') {
				throw new Error('Only pending orders can be deleted');
			}

			// Delete order
			await this.orderRepository.delete(orderId);

			// Dispatch event
			this.eventDispatcher.dispatch('order:deleted', {
				orderId,
				timestamp: new Date()
			});

			return true;
		} catch (error) {
			this.logger.error(`Error deleting order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Cancel an order
	 * @param {string} orderId - Order ID
	 * @param {string} reason - Cancellation reason
	 * @returns {Promise<Object>} Updated order
	 * @throws {Error} Not found or database error
	 */
	async cancelOrder(orderId, reason = '') {
		try {
			const order = await this.updateOrder(orderId, {
				status: 'cancelled',
				cancelledAt: new Date(),
				cancelReason: reason,
				statusNote: `Order cancelled: ${reason}`
			});

			// Dispatch event
			this.eventDispatcher.dispatch('order:cancelled', {
				orderId,
				reason,
				timestamp: new Date()
			});

			return order;
		} catch (error) {
			this.logger.error(`Error cancelling order ${orderId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Create invoice for order
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @returns {Promise<Object>} Created invoice
	 * @private
	 */
	async createOrderInvoice(order, clientInfo) {
		try {
			// // Don't create invoice for orders with TBD amounts
			// if (order.totalAmount === 'TBD' || order.deliveryFeePending) {
			// 	this.logger.info(`Skipping invoice creation for order ${order.orderNumber} - delivery fee pending`);
			// 	return null;
			// }
			const invoiceData = {
				orderId: order._id,
				clientId: order.clientId,
				clientInfo: {
					name: clientInfo.name,
					email: clientInfo.email,
					phone: clientInfo.phone,
					address: clientInfo.address
				},
				items: order.items.map(item => ({
					productId: item.productId,
					name: item.name,
					quantity: item.quantity,
					stockUnit: item.unit || 'piece',
					unitPrice: item.price,
					totalPrice: item.totalPrice || (item.quantity * item.price)
				})),
				subtotal: order.subtotal,
				tax: order.taxAmount || 0,
				discount: order.discountAmount || 0,
				deliveryFee: 0,
				totalAmount: order.subtotal,
				paymentTerms: order.paymentTerms || 'Payment due within 7 days',
				notes: order.notes || `Order #${order.orderNumber}`,
				status: 'pending'
			};

			return await InvoiceService.createInvoice(invoiceData);
		} catch (error) {
			this.logger.error(`Error creating invoice for order ${order._id}: ${error.message}`);
			// Return null instead of throwing to not break order creation
			return null;
		}
	}

	/**
	 * Send order created email notifications
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object (can be null for TBD orders)
	 * @private
	 */
	async sendOrderCreatedEmails(order, clientInfo, invoice) {
		try {
			let invoicePdf = null;

			// Generate invoice PDF only if invoice exists
			if (invoice) {
				invoicePdf = await InvoiceService.generateInvoicePDF(invoice._id);
			}

			// Send email to customer
			if (clientInfo.email) {
				await this.sendOrderEmailToCustomer(order, clientInfo, invoice, invoicePdf);
			}

			// Send email to admins
			await this.sendOrderEmailToAdmins(order, clientInfo, invoice, invoicePdf);

		} catch (error) {
			this.logger.error(`Error sending order emails: ${error.message}`);
			// Don't throw error here as order creation should succeed even if email fails
		}
	}

	/**
	 * Send delivery fee updated email notifications
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object
	 * @param {number} deliveryFee - Updated delivery fee
	 * @param {string} deliveryService - Delivery service name
	 * @private
	 */
	async sendDeliveryFeeUpdatedEmails(order, clientInfo, invoice, deliveryFee, deliveryService) {
		try {
			let invoicePdf = null;

			if (invoice) {
				invoicePdf = await InvoiceService.generateInvoicePDF(invoice._id);
			}

			// Send email to customer
			if (clientInfo.email) {
				await this.sendDeliveryFeeUpdateEmailToCustomer(order, clientInfo, invoice, invoicePdf, deliveryFee, deliveryService);
			}

			// Send email to admins
			await this.sendDeliveryFeeUpdateEmailToAdmins(order, clientInfo, invoice, invoicePdf, deliveryFee, deliveryService);

		} catch (error) {
			this.logger.error(`Error sending delivery fee update emails: ${error.message}`);
		}
	}

	/**
	 * Send order email to customer
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object (can be null)
	 * @param {Buffer} invoicePdf - Invoice PDF buffer (can be null)
	 * @private
	 */
	async sendOrderEmailToCustomer(order, clientInfo, invoice, invoicePdf) {
		try {
			const subject = `Order Confirmation #${order.orderNumber} - SheCares`;
			const html = this.generateCustomerOrderEmailTemplate(order, clientInfo, invoice);

			const attachments = [];
			if (invoicePdf) {
				attachments.push({
					filename: `Invoice-${invoice.invoiceNumber}.pdf`,
					content: invoicePdf,
					contentType: 'application/pdf'
				});
			}

			await EmailService.sendEmail({
				to: clientInfo.email,
				subject,
				html,
				attachments
			});

			this.logger.info(`Order confirmation email sent to customer: ${clientInfo.email}`);
		} catch (error) {
			this.logger.error(`Error sending order email to customer: ${error.message}`);
		}
	}

	/**
	 * Send order email to admins
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object (can be null)
	 * @param {Buffer} invoicePdf - Invoice PDF buffer (can be null)
	 * @private
	 */
	async sendOrderEmailToAdmins(order, clientInfo, invoice, invoicePdf) {
		try {
			const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['admin@shecares.com'];
			const subject = `New Order Received #${order.orderNumber} - SheCares`;
			const html = this.generateAdminOrderEmailTemplate(order, clientInfo, invoice);

			const attachments = [];
			if (invoicePdf) {
				attachments.push({
					filename: `Invoice-${invoice.invoiceNumber}.pdf`,
					content: invoicePdf,
					contentType: 'application/pdf'
				});
			}

			for (const adminEmail of adminEmails) {
				await EmailService.sendEmail({
					to: 'nifemijoseph8@gmail.com' || adminEmail.trim(),
					subject,
					html,
					attachments
				});
			}

			this.logger.info(`Order notification email sent to admins: ${adminEmails.join(', ')}`);
		} catch (error) {
			this.logger.error(`Error sending order email to admins: ${error.message}`);
		}
	}

	/**
	 * Send delivery fee update email to customer
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object
	 * @param {Buffer} invoicePdf - Invoice PDF buffer
	 * @param {number} deliveryFee - Updated delivery fee
	 * @param {string} deliveryService - Delivery service name
	 * @private
	 */
	async sendDeliveryFeeUpdateEmailToCustomer(order, clientInfo, invoice, invoicePdf, deliveryFee, deliveryService) {
		try {
			const subject = `Delivery Fee Update for Order #${order.orderNumber} - SheCares`;
			const html = this.generateDeliveryFeeUpdateCustomerEmailTemplate(order, clientInfo, invoice, deliveryFee, deliveryService);

			const attachments = [];
			if (invoicePdf) {
				attachments.push({
					filename: `Updated-Invoice-${invoice.invoiceNumber}.pdf`,
					content: invoicePdf,
					contentType: 'application/pdf'
				});
			}

			await EmailService.sendEmail({
				to: clientInfo.email,
				subject,
				html,
				attachments
			});

			this.logger.info(`Delivery fee update email sent to customer: ${clientInfo.email}`);
		} catch (error) {
			this.logger.error(`Error sending delivery fee update email to customer: ${error.message}`);
		}
	}

	/**
	 * Send delivery fee update email to admins
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object
	 * @param {Buffer} invoicePdf - Invoice PDF buffer
	 * @param {number} deliveryFee - Updated delivery fee
	 * @param {string} deliveryService - Delivery service name
	 * @private
	 */
	async sendDeliveryFeeUpdateEmailToAdmins(order, clientInfo, invoice, invoicePdf, deliveryFee, deliveryService) {
		try {
			const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['admin@shecares.com'];
			const subject = `Delivery Fee Updated for Order #${order.orderNumber} - SheCares`;
			const html = this.generateDeliveryFeeUpdateAdminEmailTemplate(order, clientInfo, invoice, deliveryFee, deliveryService);

			const attachments = [];
			if (invoicePdf) {
				attachments.push({
					filename: `Updated-Invoice-${invoice.invoiceNumber}.pdf`,
					content: invoicePdf,
					contentType: 'application/pdf'
				});
			}

			for (const adminEmail of adminEmails) {
				await EmailService.sendEmail({
					to: 'nifemijoseph8@gmail.com' || adminEmail.trim(),
					subject,
					html,
					attachments
				});
			}

			this.logger.info(`Delivery fee update notification sent to admins: ${adminEmails.join(', ')}`);
		} catch (error) {
			this.logger.error(`Error sending delivery fee update email to admins: ${error.message}`);
		}
	}

	/**
	 * Generate customer order email template
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object (can be null)
	 * @returns {string} HTML email template
	 * @private
	 */
	generateCustomerOrderEmailTemplate(order, clientInfo, invoice) {
		const itemsHtml = order.items.map(item => `
			<tr>
				<td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
				<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
				<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${item.price.toLocaleString()}</td>
				<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${item.totalPrice.toLocaleString()}</td>
			</tr>
		`).join('');

		const deliveryFeeSection = order.shippingCost === 'TBD'
			? '<p style="color: #ff9800;">Delivery Fee: <strong>To Be Determined</strong><br><small>We will calculate the delivery fee based on your location and contact you shortly.</small></p>'
			: `<p>Delivery Fee: ₦${order.shippingCost.toLocaleString()}</p>`;

		const totalSection = order.totalAmount === 'TBD'
			? `<p style="font-size: 18px; color: #e91e63;"><strong>Total: ₦${order.subtotal.toLocaleString()} + Delivery Fee (TBD)</strong></p>`
			: `<p style="font-size: 18px; color: #e91e63;"><strong>Total: ₦${order.totalAmount.toLocaleString()}</strong></p>`;

		const invoiceSection = invoice
			? `<p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>`
			: '<p><em>Invoice will be generated once delivery fee is calculated.</em></p>';

		const paymentSection = invoice
			? `<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
				<h3 style="margin-top: 0; color: #333;">Payment Information</h3>
				<p>Please find the attached invoice for payment details.</p>
				<p><strong>Payment Terms:</strong> ${invoice.paymentTerms}</p>
			</div>`
			: `<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
				<h3 style="margin-top: 0; color: #333;">Payment Information</h3>
				<p>Payment invoice will be sent once delivery fee is calculated and finalized.</p>
				<p><strong>Current Subtotal:</strong> ₦${order.subtotal.toLocaleString()}</p>
			</div>`;

		return `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Order Confirmation</title>
			</head>
			<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
				<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
					<div style="text-align: center; margin-bottom: 30px;">
						<h1 style="color: #e91e63; margin-bottom: 10px;">SheCares</h1>
						<h2 style="color: #666; margin-top: 0;">Order Confirmation</h2>
					</div>

					<div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
						<h3 style="margin-top: 0; color: #333;">Hello ${clientInfo.name},</h3>
						<p>Thank you for your order! We've received your order and it's being processed.</p>
						<p><strong>Order Number:</strong> ${order.orderNumber}</p>
						<p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
						${invoiceSection}
					</div>

					<div style="margin-bottom: 30px;">
						<h3 style="color: #333; border-bottom: 2px solid #e91e63; padding-bottom: 10px;">Order Details</h3>
						<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
							<thead>
								<tr style="background: #f5f5f5;">
									<th style="padding: 15px 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
									<th style="padding: 15px 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
									<th style="padding: 15px 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
									<th style="padding: 15px 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
								</tr>
							</thead>
							<tbody>
								${itemsHtml}
							</tbody>
						</table>
					</div>

					<div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
						<div style="text-align: right;">
							<p><strong>Subtotal: ₦${order.subtotal.toLocaleString()}</strong></p>
							${deliveryFeeSection}
							${order.discountAmount ? `<p>Discount: -₦${order.discountAmount.toLocaleString()}</p>` : ''}
							${order.taxAmount ? `<p>Tax: ₦${order.taxAmount.toLocaleString()}</p>` : ''}
							${totalSection}
						</div>
					</div>

					${order.shippingMethod === 'delivery' ? `
						<div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
							<h3 style="margin-top: 0; color: #333;">Delivery Information</h3>
							<p><strong>Method:</strong> Home Delivery</p>
							<p><strong>Address:</strong><br>
								${order.shippingAddress?.street || ''}<br>
								${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}<br>
								${order.shippingAddress?.country || ''}
							</p>
							${order.deliveryFeePending ?
			'<p style="color: #ff9800;"><strong>Note:</strong> We will calculate delivery fee based on your location and contact you with the final amount.</p>' :
			''}
						</div>
					` : `
						<div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
							<h3 style="margin-top: 0; color: #333;">Pickup Information</h3>
							<p><strong>Method:</strong> Store Pickup</p>
							<p>Please visit our store to collect your order.</p>
						</div>
					`}

					${paymentSection}

					<div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
						<p style="color: #666;">Thank you for choosing SheCares!</p>
						<p style="color: #666;">For any questions, please contact us at support@shecares.com</p>
					</div>
				</div>
			</body>
			</html>
		`;
	}

	/**
	 * Generate admin order email template
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object (can be null)
	 * @returns {string} HTML email template
	 * @private
	 */
	generateAdminOrderEmailTemplate(order, clientInfo, invoice) {
		const itemsHtml = order.items.map(item => `
			<tr>
				<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
				<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
				<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₦${item.price.toLocaleString()}</td>
				<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₦${item.totalPrice.toLocaleString()}</td>
			</tr>
		`).join('');

		const deliveryFeeStatus = order.deliveryFeePending
			? '<span style="color: #ff9800; font-weight: bold;">PENDING CALCULATION</span>'
			: `₦${order.shippingCost.toLocaleString()}`;

		const totalDisplay = order.totalAmount === 'TBD'
			? `₦${order.subtotal.toLocaleString()} + Delivery Fee (TBD)`
			: `₦${order.totalAmount.toLocaleString()}`;

		const actionRequired = order.deliveryFeePending
			? `<div style="background: #ffebee; padding: 15px; border-radius: 8px; border-left: 4px solid #f44336; margin-bottom: 20px;">
				<h4 style="margin-top: 0; color: #d32f2f;">⚠️ ACTION REQUIRED</h4>
				<p><strong>Delivery fee calculation needed for this order.</strong></p>
				<p>Please calculate delivery fee for: ${order.shippingAddress?.city}, ${order.shippingAddress?.state}</p>
			</div>`
			: '';

		return `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>New Order Notification</title>
			</head>
			<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
				<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
					<div style="text-align: center; margin-bottom: 30px;">
						<h1 style="color: #e91e63; margin-bottom: 10px;">SheCares Admin</h1>
						<h2 style="color: #666; margin-top: 0;">New Order Received</h2>
					</div>

					${actionRequired}

					<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
						<h3 style="margin-top: 0; color: #333;">Order Information</h3>
						<p><strong>Order Number:</strong> ${order.orderNumber}</p>
						<p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
						${invoice ? `<p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>` : '<p><em>Invoice pending delivery fee calculation</em></p>'}
						<p><strong>Total Amount:</strong> ${totalDisplay}</p>
						<p><strong>Status:</strong> ${order.status}</p>
						<p><strong>Delivery Fee Status:</strong> ${deliveryFeeStatus}</p>
					</div>

					<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
						<h3 style="margin-top: 0; color: #333;">Customer Information</h3>
						<p><strong>Name:</strong> ${clientInfo.name}</p>
						<p><strong>Email:</strong> ${clientInfo.email}</p>
						<p><strong>Phone:</strong> ${clientInfo.phone || 'Not provided'}</p>
					</div>

					<div style="margin-bottom: 30px;">
						<h3 style="color: #333; border-bottom: 2px solid #e91e63; padding-bottom: 10px;">Order Items</h3>
						<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
							<thead>
								<tr style="background: #f5f5f5;">
									<th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
									<th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
									<th style="padding: 10px 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
									<th style="padding: 10px 8px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
								</tr>
							</thead>
							<tbody>
								${itemsHtml}
							</tbody>
						</table>
					</div>

					<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
						<div style="text-align: right;">
							<p>Subtotal: ₦${order.subtotal.toLocaleString()}</p>
							<p>Delivery Fee: ${deliveryFeeStatus}</p>
							${order.discountAmount ? `<p>Discount: -₦${order.discountAmount.toLocaleString()}</p>` : ''}
							${order.taxAmount ? `<p>Tax: ₦${order.taxAmount.toLocaleString()}</p>` : ''}
							<p style="font-size: 18px; color: #e91e63;"><strong>Total: ${totalDisplay}</strong></p>
						</div>
					</div>

					${order.shippingMethod === 'delivery' ? `
						<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
							<h3 style="margin-top: 0; color: #333;">Delivery Details</h3>
							<p><strong>Method:</strong> Home Delivery</p>
							<p><strong>Address:</strong><br>
								${order.shippingAddress?.street || ''}<br>
								${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}<br>
								${order.shippingAddress?.country || ''}
								${order.shippingAddress?.postalCode ? `<br>${order.shippingAddress.postalCode}` : ''}
							</p>
							${order.deliveryNotes ? `<p><strong>Notes:</strong> ${order.deliveryNotes}</p>` : ''}
						</div>
					` : `
						<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
							<h3 style="margin-top: 0; color: #333;">Pickup Details</h3>
							<p><strong>Method:</strong> Store Pickup</p>
							<p>Customer will collect from store.</p>
						</div>
					`}

					<div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
						${order.deliveryFeePending ?
			'<p style="color: #d32f2f; font-weight: bold;">⚠️ Please calculate and update delivery fee for this order</p>' :
			'<p style="color: #666;">Please process this order as soon as possible.</p>'
		}
						<p style="color: #666;">Login to admin panel to manage this order.</p>
					</div>
				</div>
			</body>
			</html>
		`;
	}

	/**
	 * Generate delivery fee update customer email template
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object
	 * @param {number} deliveryFee - Updated delivery fee
	 * @param {string} deliveryService - Delivery service name
	 * @returns {string} HTML email template
	 * @private
	 */
	generateDeliveryFeeUpdateCustomerEmailTemplate(order, clientInfo, invoice, deliveryFee, deliveryService) {
		const serviceInfo = deliveryService ? ` via ${deliveryService}` : '';

		return `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>Delivery Fee Update</title>
			</head>
			<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
				<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
					<div style="text-align: center; margin-bottom: 30px;">
						<h1 style="color: #e91e63; margin-bottom: 10px;">SheCares</h1>
						<h2 style="color: #666; margin-top: 0;">Delivery Fee Update</h2>
					</div>

					<div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4caf50;">
						<h3 style="margin-top: 0; color: #333;">Good news, ${clientInfo.name}!</h3>
						<p>We've calculated the delivery fee for your order <strong>#${order.orderNumber}</strong>.</p>
						<p><strong>Delivery Fee:</strong> ₦${deliveryFee.toLocaleString()}${serviceInfo}</p>
					</div>

					<div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
						<h3 style="margin-top: 0; color: #333;">Updated Order Summary</h3>
						<div style="text-align: right;">
							<p>Subtotal: ₦${order.subtotal.toLocaleString()}</p>
							<p>Delivery Fee${serviceInfo}: ₦${deliveryFee.toLocaleString()}</p>
							${order.discountAmount ? `<p>Discount: -₦${order.discountAmount.toLocaleString()}</p>` : ''}
							${order.taxAmount ? `<p>Tax: ₦${order.taxAmount.toLocaleString()}</p>` : ''}
							<p style="font-size: 20px; color: #e91e63; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 15px;">
								<strong>Final Total: ₦${order.totalAmount.toLocaleString()}</strong>
							</p>
						</div>
					</div>

					<div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
						<h3 style="margin-top: 0; color: #333;">Delivery Information</h3>
						<p><strong>Address:</strong><br>
							${order.shippingAddress?.street || ''}<br>
							${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}<br>
							${order.shippingAddress?.country || ''}
						</p>
						${deliveryService ? `<p><strong>Delivery Service:</strong> ${deliveryService}</p>` : ''}
					</div>

					<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
						<h3 style="margin-top: 0; color: #333;">Payment Information</h3>
						<p>Your updated invoice is attached to this email.</p>
						<p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
						<p><strong>Payment Terms:</strong> ${invoice.paymentTerms}</p>
					</div>

					<div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
						<p style="color: #666;">Thank you for your patience!</p>
						<p style="color: #666;">For any questions, please contact us at support@shecares.com</p>
					</div>
				</div>
			</body>
			</html>
		`;
	}

	/**
	 * Generate delivery fee update admin email template
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object
	 * @param {number} deliveryFee - Updated delivery fee
	 * @param {string} deliveryService - Delivery service name
	 * @returns {string} HTML email template
	 * @private
	 */
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
	 * Generate delivery fee update admin email template (completion)
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object
	 * @param {number} deliveryFee - Updated delivery fee
	 * @param {string} deliveryService - Delivery service name
	 * @returns {string} HTML email template
	 * @private
	 */
	generateDeliveryFeeUpdateAdminEmailTemplate(order, clientInfo, invoice, deliveryFee, deliveryService) {
		const serviceInfo = deliveryService ? ` (${deliveryService})` : '';

		return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<title>Delivery Fee Updated</title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
				<div style="text-align: center; margin-bottom: 30px;">
					<h1 style="color: #e91e63; margin-bottom: 10px;">SheCares Admin</h1>
					<h2 style="color: #666; margin-top: 0;">Delivery Fee Updated</h2>
				</div>

				<div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4caf50;">
					<h3 style="margin-top: 0; color: #333;">✅ Delivery Fee Calculated</h3>
					<p>Delivery fee has been updated for order <strong>#${order.orderNumber}</strong></p>
					<p><strong>Delivery Fee:</strong> ₦${deliveryFee.toLocaleString()}${serviceInfo}</p>
					<p><strong>Final Total:</strong> ₦${order.totalAmount.toLocaleString()}</p>
				</div>

				<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
					<h3 style="margin-top: 0; color: #333;">Order Information</h3>
					<p><strong>Order Number:</strong> ${order.orderNumber}</p>
					<p><strong>Customer:</strong> ${clientInfo.name}</p>
					<p><strong>Email:</strong> ${clientInfo.email}</p>
					<p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
					<p><strong>Status:</strong> ${order.status}</p>
				</div>

				<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
					<h3 style="margin-top: 0; color: #333;">Updated Totals</h3>
					<div style="text-align: right;">
						<p>Subtotal: ₦${order.subtotal.toLocaleString()}</p>
						<p>Delivery Fee${serviceInfo}: ₦${deliveryFee.toLocaleString()}</p>
						${order.discountAmount ? `<p>Discount: -₦${order.discountAmount.toLocaleString()}</p>` : ''}
						${order.taxAmount ? `<p>Tax: ₦${order.taxAmount.toLocaleString()}</p>` : ''}
						<p style="font-size: 18px; color: #e91e63; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 15px;">
							<strong>Final Total: ₦${order.totalAmount.toLocaleString()}</strong>
						</p>
					</div>
				</div>

				<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
					<h3 style="margin-top: 0; color: #333;">Delivery Address</h3>
					<p>
						${order.shippingAddress?.street || ''}<br>
						${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}<br>
						${order.shippingAddress?.country || ''}
						${order.shippingAddress?.postalCode ? `<br>${order.shippingAddress.postalCode}` : ''}
					</p>
				</div>

				<div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
					<p style="color: #666;">Customer has been notified with updated invoice.</p>
					<p style="color: #666;">Login to admin panel to track order progress.</p>
				</div>
			</div>
		</body>
		</html>
	`;
	}

}

// Complete the last email template method that was cut off in the document


module.exports = OrderService;