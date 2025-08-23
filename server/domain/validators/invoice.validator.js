// src/domain/validators/invoice.validator.js

const Joi = require('joi');

/**
 * Invoice validation schemas and methods
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

// Address schema to match client schema structure
const addressSchema = Joi.object({
	street: Joi.string().trim().allow('').optional(),
	city: Joi.string().trim().allow('').optional(),
	state: Joi.string().trim().allow('').optional(),
	country: Joi.string().trim().allow('').optional(),
	postalCode: Joi.string().trim().allow('').optional()
}).optional();

// Base schemas
const createInvoiceBodySchema = Joi.object({
	// Invoice basic info - allow these fields from frontend
	invoiceNumber: Joi.string().optional(), // Frontend generates this
	orderId: Joi.string().allow(null).optional().messages({
		'string.empty': 'Order ID cannot be empty'
	}),

	// Client identification - either clientId OR individual client fields
	clientId: Joi.string().optional().messages({
		'string.empty': 'Client ID cannot be empty'
	}),

	// Individual client fields (for custom invoices)
	clientName: Joi.string().when('clientId', {
		is: Joi.exist(),
		then: Joi.optional(),
		otherwise: Joi.required().messages({
			'any.required': 'Client name is required when clientId is not provided'
		})
	}),
	clientEmail: Joi.string().email().optional(),
	clientPhone: Joi.string().optional(),
	clientAddress: Joi.alternatives().try(
		Joi.string().allow('').optional(), // For backward compatibility with string addresses
		addressSchema // For structured addresses
	).optional(),

	// Legacy clientInfo object (for backward compatibility)
	clientInfo: Joi.object({
		name: Joi.string().required().messages({
			'string.empty': 'Client name cannot be empty',
			'any.required': 'Client name is required'
		}),
		email: Joi.string().email().optional(),
		phone: Joi.string().optional(),
		address: Joi.alternatives().try(
			Joi.string().allow('').optional(), // String format for backward compatibility
			addressSchema // Structured address object
		).optional()
	}).optional(),
	signature: Joi.object({
		name: Joi.string().required().messages({
			'string.empty': 'Signature name cannot be empty',
			'any.required': 'Signature name is required'
		}),
		title: Joi.string().required().messages({
			'string.empty': 'Signature title cannot be empty',
			'any.required': 'Signature title is required'
		}),

	}).optional(),
	// Business info
	businessInfo: Joi.object({
		name: Joi.string().optional(),
		address: Joi.alternatives().try(
			Joi.string().allow('').optional(),
			addressSchema
		).optional(),
		email: Joi.string().email().optional(),
		phone: Joi.string().optional(),
		logo: Joi.string().optional()
	}).optional(),

	// Items array
	items: Joi.array().items(
		Joi.object({
			id: Joi.string().optional(), // Frontend generates temporary IDs
			productId: Joi.string().allow('').optional(), // Can be empty for custom items
			name: Joi.string().required().messages({
				'string.empty': 'Item name cannot be empty',
				'any.required': 'Item name is required'
			}),
			quantity: Joi.number().positive().required().messages({
				'number.base': 'Quantity must be a number',
				'number.positive': 'Quantity must be positive',
				'any.required': 'Quantity is required'
			}),
			unit: Joi.string().allow('').optional(),
			unitPrice: Joi.number().min(0).required().messages({
				'number.base': 'Unit price must be a number',
				'number.min': 'Unit price cannot be negative',
				'any.required': 'Unit price is required'
			}),
			totalPrice: Joi.number().min(0).optional() // Frontend calculates this
		})
	).min(1).required().messages({
		'array.min': 'At least one item is required',
		'any.required': 'Items are required'
	}),

	// Financial fields
	subtotal: Joi.number().min(0).optional(), // Frontend calculates this
	tax: Joi.number().min(0).optional(),
	discount: Joi.number().min(0).optional(),
	deliveryFee: Joi.number().min(0).optional(),
	totalAmount: Joi.number().min(0).optional(), // Frontend calculates this

	// Dates
	issueDate: Joi.date().iso().optional(),
	dueDate: Joi.date().iso().optional(),

	// Payment info
	paymentTerms: Joi.string().allow('').optional(),
	paymentDetails: Joi.object({
		bankName: Joi.string().optional(),
		accountName: Joi.string().optional(),
		accountNumber: Joi.string().optional()
	}).optional(),

	// Additional fields
	notes: Joi.string().allow('').optional(),
	status: Joi.string().valid('draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled').optional()
});

const updateInvoiceBodySchema = Joi.object({
	clientInfo: Joi.object({
		name: Joi.string().optional(),
		email: Joi.string().email().optional(),
		phone: Joi.string().optional(),
		address: Joi.alternatives().try(
			Joi.string().allow('').optional(),
			addressSchema
		).optional()
	}).optional(),
	businessInfo: Joi.object({
		name: Joi.string().optional(),
		address: Joi.alternatives().try(
			Joi.string().allow('').optional(),
			addressSchema
		).optional(),
		email: Joi.string().email().optional(),
		phone: Joi.string().optional(),
		logo: Joi.string().optional()
	}).optional(),
	items: Joi.array().items(
		Joi.object({
			productId: Joi.string().optional(),
			name: Joi.string().required(),
			quantity: Joi.number().positive().required(),
			unit: Joi.string().optional(),
			unitPrice: Joi.number().min(0).required()
		})
	).optional(),
	tax: Joi.number().min(0).optional(),
	discount: Joi.number().min(0).optional(),
	deliveryFee: Joi.number().min(0).optional(),
	dueDate: Joi.date().iso().optional(),
	paymentTerms: Joi.string().optional(),
	paymentDetails: Joi.object({
		bankName: Joi.string().optional(),
		accountName: Joi.string().optional(),
		accountNumber: Joi.string().optional()
	}).optional(),
	notes: Joi.string().allow('').optional()
});

const updateInvoiceStatusBodySchema = Joi.object({
	status: Joi.string().valid('pending', 'paid', 'partially_paid', 'overdue', 'cancelled').required().messages({
		'string.empty': 'Status cannot be empty',
		'any.required': 'Status is required',
		'any.only': 'Status must be one of: pending, paid, partially_paid, overdue, cancelled'
	}),
	note: Joi.string().allow('', null).optional()
});

const recordPaymentBodySchema = Joi.object({
	method: Joi.string().valid('cash', 'bank_transfer', 'mobile_money', 'card', 'check', 'other').required().messages({
		'string.empty': 'Payment method cannot be empty',
		'any.required': 'Payment method is required',
		'any.only': 'Payment method must be one of: cash, bank_transfer, mobile_money, card, check, other'
	}),
	amount: Joi.number().positive().required().messages({
		'number.base': 'Amount must be a number',
		'number.positive': 'Amount must be positive',
		'any.required': 'Amount is required'
	}),
	reference: Joi.string().allow('', null).optional(),
	date: Joi.date().iso().optional(),
	notes: Joi.string().allow('', null).optional()
});

const sendInvoiceBodySchema = Joi.object({
	subject: Joi.string().optional(),
	message: Joi.string().optional(),
	recipientEmail: Joi.string().email().optional()
});

const idParamSchema = Joi.object({
	id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
		'string.pattern.base': 'Invalid ID format',
		'any.required': 'ID is required'
	})
});

const orderIdParamSchema = Joi.object({
	orderId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
		'string.pattern.base': 'Invalid order ID format',
		'any.required': 'Order ID is required'
	})
});

const clientIdParamSchema = Joi.object({
	clientId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
		'string.pattern.base': 'Invalid client ID format',
		'any.required': 'Client ID is required'
	})
});

// Validation functions that return the format expected by validation middleware
const createInvoiceSchema = (data) => {
	return createInvoiceBodySchema.validate(data, { abortEarly: false });
};

const updateInvoiceSchema = (data) => {
	return updateInvoiceBodySchema.validate(data, { abortEarly: false });
};

const updateInvoiceStatusSchema = (data) => {
	return updateInvoiceStatusBodySchema.validate(data, { abortEarly: false });
};

const recordPaymentSchema = (data) => {
	return recordPaymentBodySchema.validate(data, { abortEarly: false });
};

const sendInvoiceSchema = (data) => {
	return sendInvoiceBodySchema.validate(data, { abortEarly: false });
};

const validateInvoiceId = (data) => {
	return idParamSchema.validate(data, { abortEarly: false });
};

const validateOrderId = (data) => {
	return orderIdParamSchema.validate(data, { abortEarly: false });
};

const validateClientId = (data) => {
	return clientIdParamSchema.validate(data, { abortEarly: false });
};

module.exports = {
	// Validation functions for middleware
	createInvoiceSchema,
	updateInvoiceSchema,
	updateInvoiceStatusSchema,
	recordPaymentSchema,
	sendInvoiceSchema,
	validateInvoiceId,
	validateOrderId,
	validateClientId,

	// Direct schema access if needed
	schemas: {
		createInvoiceBodySchema,
		updateInvoiceBodySchema,
		updateInvoiceStatusBodySchema,
		recordPaymentBodySchema,
		sendInvoiceBodySchema,
		idParamSchema,
		orderIdParamSchema,
		clientIdParamSchema,
		addressSchema
	}
};