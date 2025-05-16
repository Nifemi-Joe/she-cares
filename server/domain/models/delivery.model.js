// src/domain/models/delivery.model.js

/**
 * @class Delivery
 * @description Delivery domain model for order fulfillment
 * @since v1.2.0 (2023)
 * @author SheCares Development Team
 */
class Delivery {
	/**
	 * Create a new Delivery instance
	 * @param {Object} deliveryData - Delivery information
	 * @param {string} deliveryData.id - Unique identifier
	 * @param {string} deliveryData.orderId - Associated order ID
	 * @param {string} deliveryData.clientId - Client ID
	 * @param {string} deliveryData.status - Delivery status
	 * @param {Object} deliveryData.address - Delivery address
	 * @param {string} deliveryData.contactPhone - Contact phone number
	 * @param {string} deliveryData.deliveryMethod - Delivery or pickup
	 * @param {number} deliveryData.fee - Delivery fee
	 * @param {Date} deliveryData.scheduledDate - Scheduled delivery date
	 * @param {string} deliveryData.notes - Delivery notes
	 * @param {string} deliveryData.assignedTo - Staff assigned to delivery
	 * @param {Array} deliveryData.statusHistory - History of status changes
	 * @param {Date} deliveryData.completedAt - Delivery completion timestamp
	 * @param {Date} deliveryData.createdAt - Creation timestamp
	 * @param {Date} deliveryData.updatedAt - Last update timestamp
	 */
	constructor({
		            id,
		            orderId,
		            clientId,
		            status = 'pending',
		            address = {},
		            contactPhone,
		            deliveryMethod = 'delivery', // 'delivery' or 'pickup'
		            fee = 0,
		            scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day by default
		            notes = '',
		            assignedTo = null,
		            statusHistory = [],
		            completedAt = null,
		            createdAt = new Date(),
		            updatedAt = new Date()
	            }) {
		this.id = id;
		this.orderId = orderId;
		this.clientId = clientId;
		this.status = status;
		this.address = address;
		this.contactPhone = contactPhone;
		this.deliveryMethod = deliveryMethod;
		this.fee = fee;
		this.scheduledDate = scheduledDate;
		this.notes = notes;
		this.assignedTo = assignedTo;
		this.completedAt = completedAt;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;

		// Initialize status history if empty
		this.statusHistory = statusHistory.length ? statusHistory : [
			{
				status: this.status,
				timestamp: new Date(),
				note: 'Delivery created'
			}
		];
	}

	/**
	 * Create a delivery from order data
	 * @static
	 * @param {Order} order - Order to create delivery for
	 * @returns {Delivery} - New delivery instance
	 */
	static fromOrder(order) {
		const id = `del_${Date.now()}`;

		return new Delivery({
			id,
			orderId: order.id,
			clientId: order.clientId,
			status: 'pending',
			address: order.deliveryAddress,
			contactPhone: order.contactPhone,
			deliveryMethod: order.deliveryMethod,
			fee: order.deliveryFee,
			notes: order.deliveryNotes || ''
		});
	}

	/**
	 * Update delivery status
	 * @param {string} newStatus - New status (pending, assigned, in-transit, delivered, failed, cancelled)
	 * @param {string} note - Note explaining status change
	 */
	updateStatus(newStatus, note = '') {
		this.status = newStatus;
		this.statusHistory.push({
			status: newStatus,
			timestamp: new Date(),
			note: note || `Status changed to ${newStatus}`
		});

		if (newStatus === 'delivered') {
			this.completedAt = new Date();
		}

		this.updatedAt = new Date();
	}

	/**
	 * Assign delivery to staff member
	 * @param {string} staffId - ID of staff member
	 * @param {string} staffName - Name of staff member
	 */
	assignTo(staffId, staffName) {
		this.assignedTo = staffId;
		this.updateStatus('assigned', `Assigned to ${staffName}`);
	}

	/**
	 * Mark delivery as in transit
	 * @param {string} note - Optional note
	 */
	markInTransit(note = '') {
		this.updateStatus('in-transit', note || 'Delivery is now in transit');
	}

	/**
	 * Mark delivery as completed
	 * @param {string} note - Optional note
	 */
	complete(note = '') {
		this.updateStatus('delivered', note || 'Delivery completed successfully');
		this.completedAt = new Date();
	}

	/**
	 * Mark delivery as failed
	 * @param {string} reason - Failure reason
	 */
	fail(reason) {
		this.updateStatus('failed', reason || 'Delivery failed');
	}

	/**
	 * Cancel delivery
	 * @param {string} reason - Cancellation reason
	 */
	cancel(reason) {
		this.updateStatus('cancelled', reason || 'Delivery cancelled');
	}

	/**
	 * Reschedule delivery
	 * @param {Date} newDate - New scheduled date
	 * @param {string} reason - Rescheduling reason
	 */
	reschedule(newDate, reason = '') {
		const oldDate = this.scheduledDate;
		this.scheduledDate = newDate;
		this.statusHistory.push({
			status: this.status,
			timestamp: new Date(),
			note: reason || `Rescheduled from ${oldDate.toDateString()} to ${newDate.toDateString()}`
		});
		this.updatedAt = new Date();
	}

	/**
	 * Add a note to the delivery
	 * @param {string} note - Note text
	 * @param {string} author - Note author
	 */
	addNote(note, author = 'system') {
		const timestamp = new Date().toISOString();
		this.notes = this.notes
			? `${this.notes}\n[${timestamp}][${author}]: ${note}`
			: `[${timestamp}][${author}]: ${note}`;

		this.updatedAt = new Date();
	}

	/**
	 * Convert to plain object for serialization
	 * @returns {Object} Plain JavaScript object
	 */
	toJSON() {
		return {
			id: this.id,
			orderId: this.orderId,
			clientId: this.clientId,
			status: this.status,
			address: this.address,
			contactPhone: this.contactPhone,
			deliveryMethod: this.deliveryMethod,
			fee: this.fee,
			scheduledDate: this.scheduledDate,
			notes: this.notes,
			assignedTo: this.assignedTo,
			statusHistory: this.statusHistory,
			completedAt: this.completedAt,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		};
	}
}

module.exports = Delivery;