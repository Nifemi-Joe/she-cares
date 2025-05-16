// src/services/delivery.service.js

const deliveryRepository = require('../data/repositories/delivery.repository');
const orderRepository = require('../data/repositories/order.repository');
const clientRepository = require('../data/repositories/client.repository');
const emailService = require('./email.service');
const { NotFoundError, ValidationError } = require('../utils/error-handler');
const eventDispatcher = require('../domain/events/event-dispatcher');
const eventTypes = require('../domain/events/event-types');

/**
 * @class DeliveryService
 * @description Service handling delivery operations
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */
class DeliveryService {
	/**
	 * Create a new delivery
	 * @param {Object} deliveryData - Delivery data
	 * @returns {Object} Created delivery
	 */
	async createDelivery(deliveryData) {
		// Validate required fields
		if (!deliveryData.orderId) {
			throw new ValidationError('Order ID is required');
		}

		// Check if order exists
		const order = await orderRepository.findById(deliveryData.orderId);
		if (!order) {
			throw new NotFoundError('Order not found');
		}

		// Check if delivery already exists for this order
		const existingDelivery = await deliveryRepository.findByOrderId(deliveryData.orderId);
		if (existingDelivery) {
			throw new ValidationError('Delivery already exists for this order');
		}

		// Create delivery
		const delivery = await deliveryRepository.create({
			...deliveryData,
			status: deliveryData.status || 'pending',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Dispatch event for delivery creation
		eventDispatcher.dispatch(eventTypes.DELIVERY_CREATED, { delivery, orderId: order.id });

		return delivery;
	}

	/**
	 * Get all deliveries
	 * @param {Object} options - Query options (pagination, sorting, filtering)
	 * @returns {Array} List of deliveries
	 */
	async getAllDeliveries(options = {}) {
		return deliveryRepository.findAll(options);
	}

	/**
	 * Get delivery by ID
	 * @param {string} deliveryId - Delivery ID
	 * @returns {Object} Delivery
	 */
	async getDeliveryById(deliveryId) {
		const delivery = await deliveryRepository.findById(deliveryId);
		if (!delivery) {
			throw new NotFoundError('Delivery not found');
		}
		return delivery;
	}

	/**
	 * Get delivery by order ID
	 * @param {string} orderId - Order ID
	 * @returns {Object} Delivery
	 */
	async getDeliveryByOrderId(orderId) {
		const delivery = await deliveryRepository.findByOrderId(orderId);
		if (!delivery) {
			throw new NotFoundError('Delivery not found for this order');
		}
		return delivery;
	}

	/**
	 * Update delivery
	 * @param {string} deliveryId - Delivery ID
	 * @param {Object} updateData - Delivery update data
	 * @returns {Object} Updated delivery
	 */
	async updateDelivery(deliveryId, updateData) {
		// Check if delivery exists
		const delivery = await deliveryRepository.findById(deliveryId);
		if (!delivery) {
			throw new NotFoundError('Delivery not found');
		}

		// Prevent updating order ID
		if (updateData.orderId) {
			throw new ValidationError('Order ID cannot be updated');
		}

		// Update delivery
		const updatedDelivery = await deliveryRepository.update(deliveryId, {
			...updateData,
			updatedAt: new Date()
		});

		// Dispatch event for delivery update
		eventDispatcher.dispatch(eventTypes.DELIVERY_UPDATED, {
			deliveryId,
			updates: updateData,
			delivery: updatedDelivery
		});

		return updatedDelivery;
	}

	/**
	 * Update delivery status
	 * @param {string} deliveryId - Delivery ID
	 * @param {string} status - Delivery status
	 * @param {string} [notes] - Optional notes about the status change
	 * @returns {Object} Updated delivery
	 */
	async updateDeliveryStatus(deliveryId, status, notes) {
		// Check if delivery exists
		const delivery = await deliveryRepository.findById(deliveryId);
		if (!delivery) {
			throw new NotFoundError('Delivery not found');
		}

		// Validate status
		const validStatuses = ['pending', 'processing', 'out_for_delivery', 'delivered', 'failed', 'cancelled'];
		if (!validStatuses.includes(status)) {
			throw new ValidationError('Invalid delivery status');
		}

		// Update status
		const statusHistory = delivery.statusHistory || [];
		statusHistory.push({
			status,
			timestamp: new Date(),
			notes: notes || ''
		});

		const updatedDelivery = await deliveryRepository.update(deliveryId, {
			status,
			statusHistory,
			updatedAt: new Date()
		});

		// Handle notifications based on status change
		await this._handleStatusChangeNotifications(updatedDelivery, status);

		// Dispatch event for delivery status update
		eventDispatcher.dispatch(eventTypes.DELIVERY_STATUS_UPDATED, {
			deliveryId,
			status,
			notes,
			delivery: updatedDelivery
		});

		return updatedDelivery;
	}

	/**
	 * Assign delivery to driver/staff
	 * @param {string} deliveryId - Delivery ID
	 * @param {string} assigneeId - User ID of assignee
	 * @returns {Object} Updated delivery
	 */
	async assignDelivery(deliveryId, assigneeId) {
		// Check if delivery exists
		const delivery = await deliveryRepository.findById(deliveryId);
		if (!delivery) {
			throw new NotFoundError('Delivery not found');
		}

		// In a real app, we would validate the assignee exists
		// const userService = require('./auth.service');
		// await userService.getProfile(assigneeId);

		return deliveryRepository.update(deliveryId, {
			assigneeId,
			updatedAt: new Date()
		});
	}

	/**
	 * Schedule delivery
	 * @param {string} deliveryId - Delivery ID
	 * @param {Date} scheduledDate - Scheduled delivery date
	 * @param {string} [timeSlot] - Optional time slot
	 * @returns {Object} Updated delivery
	 */
	async scheduleDelivery(deliveryId, scheduledDate, timeSlot) {
		// Check if delivery exists
		const delivery = await deliveryRepository.findById(deliveryId);
		if (!delivery) {
			throw new NotFoundError('Delivery not found');
		}

		// Validate date is in the future
		const now = new Date();
		if (new Date(scheduledDate) < now) {
			throw new ValidationError('Scheduled date must be in the future');
		}

		return deliveryRepository.update(deliveryId, {
			scheduledDate,
			timeSlot,
			status: 'processing',
			updatedAt: new Date()
		});
	}

	/**
	 * Calculate delivery fee
	 * @param {Object} deliveryInfo - Delivery information
	 * @returns {number} Delivery fee
	 */
	calculateDeliveryFee(deliveryInfo) {
		// This would typically implement business logic for delivery fee calculation
		// based on distance, weight, location, etc.

		// Simple example implementation
		const baseFee = 500; // in Naira

		// Calculate based on distance (if provided)
		let distanceFee = 0;
		if (deliveryInfo.distance) {
			distanceFee = deliveryInfo.distance * 100; // 100 Naira per km
		}

		// Calculate based on weight (if provided)
		let weightFee = 0;
		if (deliveryInfo.weight) {
			weightFee = deliveryInfo.weight * 50; // 50 Naira per kg
		}

		// Apply location surcharge (if applicable)
		let locationFee = 0;
		if (deliveryInfo.location === 'remote') {
			locationFee = 1000;
		}

		// Calculate total fee
		const totalFee = baseFee + distanceFee + weightFee + locationFee;

		// Apply minimum fee
		const minimumFee = 800;
		return Math.max(totalFee, minimumFee);
	}

	/**
	 * Get deliveries by client ID
	 * @param {string} clientId - Client ID
	 * @param {Object} options - Query options
	 * @returns {Array} Client deliveries
	 */
	async getDeliveriesByClient(clientId, options = {}) {
		// Check if client exists
		const client = await clientRepository.findById(clientId);
		if (!client) {
			throw new NotFoundError('Client not found');
		}

		return deliveryRepository.findByClientId(clientId, options);
	}

	/**
	 * Get pending deliveries
	 * @param {Object} options - Query options
	 * @returns {Array} Pending deliveries
	 */
	async getPendingDeliveries(options = {}) {
		return deliveryRepository.findByStatus('pending', options);
	}

	/**
	 * Get deliveries by date range
	 * @param {Date} startDate - Start date
	 * @param {Date} endDate - End date
	 * @param {Object} options - Query options
	 * @returns {Array} Deliveries within date range
	 */
	async getDeliveriesByDateRange(startDate, endDate, options = {}) {
		return deliveryRepository.findByDateRange(startDate, endDate, options);
	}

	/**
	 * Cancel delivery
	 * @param {string} deliveryId - Delivery ID
	 * @param {string} reason - Cancellation reason
	 * @returns {Object} Updated delivery
	 */
	async cancelDelivery(deliveryId, reason) {
		// Check if delivery exists
		const delivery = await deliveryRepository.findById(deliveryId);
		if (!delivery) {
			throw new NotFoundError('Delivery not found');
		}

		// Check if delivery can be cancelled
		if (delivery.status === 'delivered') {
			throw new ValidationError('Cannot cancel a delivered order');
		}

		return this.updateDeliveryStatus(deliveryId, 'cancelled', reason);
	}

	/**
	 * Handle notifications based on delivery status changes
	 * @param {Object} delivery - Delivery object
	 * @param {string} newStatus - New delivery status
	 * @private
	 */
	async _handleStatusChangeNotifications(delivery, newStatus) {
		try {
			// Get order and client information
			const order = await orderRepository.findById(delivery.orderId);
			if (!order) return;

			const client = await clientRepository.findById(order.clientId);
			if (!client || !client.email) return;

			// Send notification based on status
			let subject = '';
			let message = '';

			switch (newStatus) {
				case 'processing':
					subject = 'Your delivery is being processed';
					message = `Your order #${order.orderNumber} is now being processed for delivery.`;
					break;
				case 'out_for_delivery':
					subject = 'Your delivery is on its way';
					message = `Good news! Your order #${order.orderNumber} is now out for delivery.`;
					break;
				case 'delivered':
					subject = 'Your order has been delivered';
					message = `Your order #${order.orderNumber} has been delivered. Thank you for your business!`;
					break;
				case 'failed':
					subject = 'Delivery attempt unsuccessful';
					message = `We were unable to deliver your order #${order.orderNumber}. Our team will contact you soon.`;
					break;
				default:
					return; // No notification for other statuses
			}

			if (subject && message) {
				await emailService.sendEmail({
					to: client.email,
					subject,
					text: message
				});
			}
		} catch (error) {
			// Log error but don't stop the flow
			console.error('Error sending delivery notification:', error);
		}
	}
}

module.exports = new DeliveryService();