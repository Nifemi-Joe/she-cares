// src/services/order.service.js
const { logger } = require('../infrastructure/logging/logger');
const EmailService = require('./email.service');
const InvoiceService = require('./invoice.service');

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

			// Create order ID if not provided
			if (!orderData.id) {
				orderData.id = `order_${Date.now()}`;
			}

			// Generate order number if not provided
			if (!orderData.orderNumber) {
				orderData.orderNumber = await this.generateOrderNumber();
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

			// Get client information for emails
			const clientInfo = await this.getClientInfo(savedOrder.clientId);
			console.log(clientInfo);

			// Create invoice for the order
			const invoice = await this.createOrderInvoice(savedOrder, clientInfo);

			// Send email notifications
			await this.sendOrderCreatedEmails(savedOrder, clientInfo, invoice);

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

			// Handle amount range filters
			if (cleanFilters.minTotal || cleanFilters.maxTotal) {
				cleanFilters.totalAmount = {};

				if (cleanFilters.minTotal) {
					cleanFilters.totalAmount.$gte = cleanFilters.minTotal;
					delete cleanFilters.minTotal;
				}

				if (cleanFilters.maxTotal) {
					cleanFilters.totalAmount.$lte = cleanFilters.maxTotal;
					delete cleanFilters.maxTotal;
				}
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

	/**
	 * Get order statistics
	 * @param {Object} filters - Optional date filters
	 * @returns {Promise<Object>} Order statistics
	 * @throws {Error} Database error
	 */
	async getOrderStats(filters = {}) {
		try {
			return await this.orderRepository.getOrderStats(filters);
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
	async getSalesData(period = '30d') {
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

			// Get orders in the specified period
			const orders = await this.getOrders({
				createdAfter: startDate,
				createdBefore: endDate
			}, {
				limit: 1000, // Large limit to get all orders
				sort: { createdAt: 1 }
			});

			// Process data for charts
			const salesData = this._processSalesDataForChart(orders.data, period);

			return {
				period,
				data: salesData,
				totalSales: orders.data.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0),
				totalOrders: orders.data.length
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
			data.sales += order.totalAmount || order.total || 0;
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
				cancelReason: reason
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
			const invoiceData = {
				orderId: order.id,
				clientId: order.clientId,
				clientInfo: {
					name: clientInfo.name,
					email: clientInfo.email,
					phone: clientInfo.phone,
					address: clientInfo.address
				},
				items: order.items.map(item => ({
					productId: item.productId,
					name: item.name || item.product?.name,
					quantity: item.quantity,
					stockUnit: item.stockUnit || 'piece',
					unitPrice: item.unitPrice || item.price,
					totalPrice: item.totalPrice || (item.quantity * (item.unitPrice || item.price))
				})),
				subtotal: order.subtotal,
				tax: order.tax || 0,
				discount: order.discount || 0,
				deliveryFee: order.deliveryFee || 0,
				totalAmount: order.totalAmount || order.total,
				paymentTerms: order.paymentTerms || 'Payment due within 7 days',
				notes: order.notes || `Order #${order.orderNumber}`,
				status: 'pending'
			};

			return await InvoiceService.createInvoice(invoiceData);
		} catch (error) {
			this.logger.error(`Error creating invoice for order ${order.id}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Send order created email notifications
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object
	 * @private
	 */
	async sendOrderCreatedEmails(order, clientInfo, invoice) {
		try {
			// Generate invoice PDF
			const invoicePdf = await InvoiceService.generateInvoicePDF(invoice._id);

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
	 * Send order email to customer
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object
	 * @param {Buffer} invoicePdf - Invoice PDF buffer
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
	 * @param {Object} invoice - Invoice object
	 * @param {Buffer} invoicePdf - Invoice PDF buffer
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
	 * Generate customer order email template
	 * @param {Object} order - Order object
	 * @param {Object} clientInfo - Client information
	 * @param {Object} invoice - Invoice object
	 * @returns {string} HTML email template
	 * @private
	 */
	generateCustomerOrderEmailTemplate(order, clientInfo, invoice) {
		const itemsHtml = order.items.map(item => `
			<tr>
				<td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name || item.product?.name}</td>
				<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
				<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${(item.unitPrice || item.price).toLocaleString()}</td>
				<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${(item.totalPrice || (item.quantity * (item.unitPrice || item.price))).toLocaleString()}</td>
			</tr>
		`).join('');

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
						<p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
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
							${order.deliveryFee ? `<p>Delivery Fee: ₦${order.deliveryFee.toLocaleString()}</p>` : ''}
							${order.discount ? `<p>Discount: -₦${order.discount.toLocaleString()}</p>` : ''}
							${order.tax ? `<p>Tax: ₦${order.tax.toLocaleString()}</p>` : ''}
							<p style="font-size: 18px; color: #e91e63;"><strong>Total: ₦${(order.totalAmount || order.total).toLocaleString()}</strong></p>
						</div>
					</div>

					${order.deliveryMethod === 'delivery' ? `
						<div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
							<h3 style="margin-top: 0; color: #333;">Delivery Information</h3>
							<p><strong>Method:</strong> Home Delivery</p>
							<p><strong>Address:</strong><br>
								${order.deliveryAddress?.street || ''}<br>
								${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''}<br>
								${order.deliveryAddress?.country || ''}
							</p>
						</div>
					` : `
						<div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
							<h3 style="margin-top: 0; color: #333;">Pickup Information</h3>
							<p><strong>Method:</strong> Store Pickup</p>
							<p>Please visit our store to collect your order.</p>
						</div>
					`}

					<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
						<h3 style="margin-top: 0; color: #333;">Payment Information</h3>
						<p>Please find the attached invoice for payment details.</p>
						<p><strong>Payment Terms:</strong> ${invoice.paymentTerms}</p>
					</div>

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
	 * @param {Object} invoice - Invoice object
	 * @returns {string} HTML email template
	 * @private
	 */
	generateAdminOrderEmailTemplate(order, clientInfo, invoice) {
		const itemsHtml = order.items.map(item => `
			<tr>
				<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name || item.product?.name}</td>
				<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
				<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₦${(item.unitPrice || item.price).toLocaleString()}</td>
				<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₦${(item.totalPrice || (item.quantity * (item.unitPrice || item.price))).toLocaleString()}</td>
			</tr>
		`).join('');

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

					<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
						<h3 style="margin-top: 0; color: #333;">Order Information</h3>
						<p><strong>Order Number:</strong> ${order.orderNumber}</p>
						<p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
						<p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
						<p><strong>Total Amount:</strong> ₦${(order.totalAmount || order.total).toLocaleString()}</p>
						<p><strong>Status:</strong> ${order.status}</p>
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
							${order.deliveryFee ? `<p>Delivery Fee: ₦${order.deliveryFee.toLocaleString()}</p>` : ''}
							${order.discount ? `<p>Discount: -₦${order.discount.toLocaleString()}</p>` : ''}
							${order.tax ? `<p>Tax: ₦${order.tax.toLocaleString()}</p>` : ''}
							<p style="font-size: 18px; color: #e91e63;"><strong>Total: ₦${(order.totalAmount || order.total).toLocaleString()}</strong></p>
						</div>
					</div>

					${order.deliveryMethod === 'delivery' ? `
						<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
							<h3 style="margin-top: 0; color: #333;">Delivery Details</h3>
							<p><strong>Method:</strong> Home Delivery</p>
							<p><strong>Address:</strong><br>
								${order.deliveryAddress?.street || ''}<br>
								${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''}<br>
								${order.deliveryAddress?.country || ''}
							</p>
						</div>
					` : `
						<div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
							<h3 style="margin-top: 0; color: #333;">Pickup Details</h3>
							<p><strong>Method:</strong> Store Pickup</p>
							<p>Customer will collect from store.</p>
						</div>
					`}

					<div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
						<p style="color: #666;">Please process this order as soon as possible.</p>
						<p style="color: #666;">Login to admin panel to manage this order.</p>
					</div>
				</div>
			</body>
			</html>
		`;
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
}

module.exports = OrderService;