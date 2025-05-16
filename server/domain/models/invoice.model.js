// src/domain/models/invoice.model.js

/**
 * @class Invoice
 * @description Invoice domain model for financial records
 * @since v1.3.0 (2016)
 * @author SheCares Development Team
 */
class Invoice {
	/**
	 * Create a new Invoice instance
	 * @param {Object} invoiceData - Invoice information
	 * @param {string} invoiceData.id - Unique identifier
	 * @param {string} invoiceData.orderId - Associated order ID
	 * @param {string} invoiceData.clientId - Client ID
	 * @param {string} invoiceData.invoiceNumber - Human-readable invoice number
	 * @param {Date} invoiceData.issueDate - Date invoice was issued
	 * @param {Date} invoiceData.dueDate - Payment due date
	 * @param {Array} invoiceData.items - Invoice line items
	 * @param {number} invoiceData.subtotal - Invoice subtotal
	 * @param {number} invoiceData.tax - Tax amount
	 * @param {number} invoiceData.deliveryFee - Delivery fee
	 * @param {number} invoiceData.discount - Applied discount
	 * @param {number} invoiceData.total - Invoice total
	 * @param {string} invoiceData.status - Invoice payment status
	 * @param {Object} invoiceData.paymentDetails - Bank account and reference
	 * @param {Object} invoiceData.billingAddress - Client billing address
	 * @param {Array} invoiceData.transactions - Payment transactions
	 * @param {Object} invoiceData.metadata - Additional invoice metadata
	 * @param {Date} invoiceData.createdAt - Creation timestamp
	 * @param {Date} invoiceData.updatedAt - Last update timestamp
	 */
	constructor({
		            id,
		            orderId,
		            clientId,
		            invoiceNumber,
		            issueDate = new Date(),
		            dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
		            items = [],
		            subtotal = 0,
		            tax = 0,
		            deliveryFee = 0,
		            discount = 0,
		            total = 0,
		            status = 'unpaid',
		            paymentDetails = {
			            bankName: 'First Bank Nigeria',
			            accountName: 'SheCares Business',
			            accountNumber: '1234567890',
			            reference: ''
		            },
		            billingAddress = {},
		            transactions = [],
		            metadata = {},
		            notes = '',
		            createdAt = new Date(),
		            updatedAt = new Date()
	            }) {
		this.id = id;
		this.orderId = orderId;
		this.clientId = clientId;
		this.invoiceNumber = invoiceNumber;
		this.issueDate = issueDate;
		this.dueDate = dueDate;
		this.items = items;
		this.subtotal = subtotal;
		this.tax = tax;
		this.deliveryFee = deliveryFee;
		this.discount = discount;
		this.total = total;
		this.status = status;
		this.paymentDetails = paymentDetails;
		this.billingAddress = billingAddress;
		this.transactions = transactions;
		this.metadata = metadata;
		this.notes = notes;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;

		// Status history
		this.statusHistory = [
			{
				status: this.status,
				timestamp: new Date(),
				note: 'Invoice created'
			}
		];
	}

	/**
	 * Generate invoice from order data
	 * @static
	 * @param {Order} order - Order to convert to invoice
	 * @param {string} invoiceNumber - Generated invoice number
	 * @param {Object} options - Additional invoice options
	 * @returns {Invoice} - New invoice instance
	 */
	static fromOrder(order, invoiceNumber, options = {}) {
		const id = `inv_${Date.now()}`;

		// Map order items to invoice items
		const items = order.items.map(item => ({
			productId: item.productId,
			name: item.name,
			description: item.variant ? `${item.name} (${item.variant})` : item.name,
			quantity: item.quantity,
			unitPrice: item.price,
			subtotal: item.subtotal,
			tax: 0 // Nigeria often uses VAT-exclusive pricing
		}));

		// Set payment reference to order ID by default
		const paymentDetails = {
			bankName: options.bankName || 'First Bank Nigeria',
			accountName: options.accountName || 'SheCares Business',
			accountNumber: options.accountNumber || '1234567890',
			reference: `ORD-${order.id}`
		};

		return new Invoice({
			id,
			orderId: order.id,
			clientId: order.clientId,
			invoiceNumber,
			items,
			subtotal: order.subtotal,
			deliveryFee: order.deliveryFee,
			discount: order.discount,
			total: order.total,
			paymentDetails,
			billingAddress: order.deliveryAddress || {},
			metadata: {
				deliveryMethod: order.deliveryMethod
			}
		});
	}

	/**
	 * Update invoice status
	 * @param {string} newStatus - New status value (unpaid, paid, partial, cancelled, overdue)
	 * @param {string} note - Note explaining status change
	 */
	updateStatus(newStatus, note = '') {
		this.status = newStatus;
		this.statusHistory.push({
			status: newStatus,
			timestamp: new Date(),
			note: note || `Status changed to ${newStatus}`
		});
		this.updatedAt = new Date();
	}

	/**
	 * Record payment transaction for this invoice
	 * @param {Object} transaction - Transaction details
	 * @param {string} transaction.method - Payment method
	 * @param {number} transaction.amount - Payment amount
	 * @param {string} transaction.reference - Payment reference
	 * @param {Date} transaction.date - Transaction date
	 * @param {string} transaction.note - Transaction note
	 * @returns {string} - Generated transaction ID
	 */
	recordPayment(transaction) {
		const transactionId = `trx_${Date.now()}`;
		const paymentDate = transaction.date || new Date();

		this.transactions.push({
			id: transactionId,
			...transaction,
			date: paymentDate,
			createdAt: new Date()
		});

		// Calculate total amount paid so far
		const totalPaid = this.transactions.reduce((sum, trx) => sum + trx.amount, 0);

		// Update status based on payment
		if (totalPaid >= this.total) {
			this.updateStatus('paid', 'Full payment received');
		} else if (totalPaid > 0) {
			this.updateStatus('partial', 'Partial payment received');
		}

		this.updatedAt = new Date();
		return transactionId;
	}

	/**
	 * Check if invoice is overdue
	 * @returns {boolean} Whether invoice is overdue
	 */
	isOverdue() {
		return this.dueDate < new Date() && this.status !== 'paid';
	}

	/**
	 * Mark invoice as overdue
	 */
	markAsOverdue() {
		if (this.isOverdue() && this.status !== 'overdue') {
			this.updateStatus('overdue', 'Payment due date has passed');
		}
	}

	/**
	 * Cancel invoice
	 * @param {string} reason - Cancellation reason
	 */
	cancel(reason) {
		this.updateStatus('cancelled', reason || 'Invoice cancelled');
	}

	/**
	 * Generate payment reference
	 * @returns {string} - Unique payment reference
	 */
	generatePaymentReference() {
		const ref = `PAY-${this.invoiceNumber}-${Date.now().toString().substr(-6)}`;
		this.paymentDetails.reference = ref;
		this.updatedAt = new Date();
		return ref;
	}

	/**
	 * Add a note to the invoice
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
			invoiceNumber: this.invoiceNumber,
			issueDate: this.issueDate,
			dueDate: this.dueDate,
			items: this.items,
			subtotal: this.subtotal,
			tax: this.tax,
			deliveryFee: this.deliveryFee,
			discount: this.discount,
			total: this.total,
			status: this.status,
			paymentDetails: this.paymentDetails,
			billingAddress: this.billingAddress,
			transactions: this.transactions,
			metadata: this.metadata,
			notes: this.notes,
			statusHistory: this.statusHistory,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		};
	}
}

module.exports = Invoice;