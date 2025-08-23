const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const PaymentSchema = new Schema({
	id: {
		type: String,
		required: true
	},
	amount: {
		type: Number,
		required: true,
		min: 0
	},
	method: {
		type: String,
		enum: ['cash', 'bank_transfer', 'mobile_money', 'card', 'check', 'other'],
		default: 'other'
	},
	reference: {
		type: String,
		trim: true
	},
	date: {
		type: Date,
		default: Date.now
	},
	notes: {
		type: String,
		trim: true
	}
});

const InvoiceItemSchema = new Schema({
	productId: {
		type: Schema.Types.ObjectId,
		ref: 'Product'
	},
	name: {
		type: String,
		required: true,
		trim: true
	},
	quantity: {
		type: Number,
		required: true,
		min: 0
	},
	unit: {
		type: String,
		trim: true
	},
	unitPrice: {
		type: Number,
		required: true,
		min: 0
	},
	totalPrice: {
		type: Number,
		required: true,
		min: 0
	}
});

const InvoiceSchema = new Schema({
	invoiceNumber: {
		type: String,
		required: true,
		unique: true,
		trim: true
	},
	type: {
		type: String,
		enum: ['standalone', 'order_based'],
		default: 'standalone'
	},
	orderId: {
		type: Schema.Types.ObjectId,
		ref: 'Order',
		sparse: true  // This allows multiple documents with null/undefined orderId
	},
	clientId: {
		type: Schema.Types.ObjectId,
		ref: 'Client'
	},
	signature: {
		name: {type: String, default: "Folukemi Joseph"},
		title: {type: String, default: "Kemi Joseph"}
	},
	clientInfo: {
		name: { type: String, required: true },
		email: { type: String },
		phone: { type: String },
		address: { type: String }
	},
	businessInfo: {
		name: { type: String, default: 'SheCares' },
		address: { type: String, default: 'Lagos, Nigeria' },
		email: { type: String, default: 'contact@shecares.com' },
		phone: { type: String, default: '+234 XXX XXX XXXX' },
		logo: { type: String }
	},
	items: [InvoiceItemSchema],
	subtotal: {
		type: Number,
		required: true,
		min: 0
	},
	tax: {
		type: Number,
		default: 0,
		min: 0
	},
	discount: {
		type: Number,
		default: 0,
		min: 0
	},
	deliveryFee: {
		type: Number,
		default: 0,
		min: 0
	},
	totalAmount: {
		type: Number,
		required: true,
		min: 0
	},
	paidAmount: {
		type: Number,
		default: 0,
		min: 0
	},
	issueDate: {
		type: Date,
		default: Date.now
	},
	dueDate: {
		type: Date
	},
	status: {
		type: String,
		enum: ['draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled'],
		default: 'pending'
	},
	paymentTerms: {
		type: String,
		trim: true,
		default: 'Payment due within 7 days'
	},
	paymentDetails: {
		bankName: { type: String },
		accountName: { type: String },
		accountNumber: { type: String }
	},
	notes: {
		type: String,
		trim: true
	},
	payments: [PaymentSchema],
	lastSentAt: {
		type: Date
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
}, {
	toJSON: { virtuals: true },
	toObject: { virtuals: true }
});

// Virtuals
InvoiceSchema.virtual('balance').get(function() {
	return this.totalAmount - this.paidAmount;
});

InvoiceSchema.virtual('isPaid').get(function() {
	return this.paidAmount >= this.totalAmount;
});

InvoiceSchema.virtual('isOverdue').get(function() {
	if (!this.dueDate) return false;
	return !this.isPaid && new Date() > this.dueDate;
});

// Pre-save middleware
InvoiceSchema.pre('save', function(next) {
	if (this.isOverdue && this.status === 'pending') {
		this.status = 'overdue';
	}

	if (this.isPaid && ['pending', 'partially_paid', 'overdue'].includes(this.status)) {
		this.status = 'paid';
	} else if (!this.isPaid && this.paidAmount > 0 && this.status !== 'cancelled') {
		this.status = 'partially_paid';
	}

	this.updatedAt = new Date();
	next();
});

module.exports = mongoose.model('Invoice', InvoiceSchema);