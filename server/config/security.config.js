// src/config/security.config.js

/**
 * Security configuration
 * @module config/security
 * @description Security settings including authentication and authorization
 * @since v1.0.0 (2023)
 * @author SheCares Development Team
 */

const env = process.env.NODE_ENV;

/**
 * JWT (JSON Web Token) configuration
 */
const jwtConfig = {
	development: {
		secret: process.env.JWT_SECRET,
		expiresIn: process.env.JWT_EXPIRES_IN,
		refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
		algorithm: 'HS256',
		issuer: 'shecaresmarket-dev'
	},
	test: {
		secret: process.env.JWT_SECRET,
		expiresIn: process.env.JWT_EXPIRES_IN,
		refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
		algorithm: 'HS256',
		issuer: 'shecaresmarket-test'
	},
	production: {
		secret: process.env.JWT_SECRET,
		expiresIn: process.env.JWT_EXPIRES_IN,
		refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
		algorithm: 'HS256',
		issuer: 'shecaresmarket'
	}
};

/**
 * Password hashing configuration
 */
const passwordConfig = {
	saltRounds: 10,
	minLength: 8,
	requireUppercase: true,
	requireLowercase: true,
	requireNumbers: true,
	requireSpecialChars: true
};

/**
 * Rate limiting configuration
 */
const rateLimitConfig = {
	development: {
		enabled: false,
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 100, // limit each IP to 100 requests per windowMs
		standardHeaders: true,
		legacyHeaders: false
	},
	test: {
		enabled: false,
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 100, // limit each IP to 100 requests per windowMs
		standardHeaders: true,
		legacyHeaders: false
	},
	production: {
		enabled: true,
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 100, // limit each IP to 100 requests per windowMs
		standardHeaders: true,
		legacyHeaders: false,
		// Different limits for specific endpoints
		endpoints: {
			'/api/v1/auth/login': {
				windowMs: 60 * 60 * 1000, // 1 hour
				max: 10 // 10 attempts per hour
			},
			'/api/v1/auth/register': {
				windowMs: 60 * 60 * 1000, // 1 hour
				max: 5 // 5 attempts per hour
			}
		}
	}
};

/**
 * CORS (Cross-Origin Resource Sharing) configuration
 */
const corsConfig = {
	development: {
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		exposedHeaders: ['X-Total-Count'],
		credentials: true,
		maxAge: 86400 // 24 hours
	},
	test: {
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		exposedHeaders: ['X-Total-Count'],
		credentials: true,
		maxAge: 86400 // 24 hours
	},
	production: {
		origin: [
			'https://shecaresmarket.com',
			'https://admin.shecaresmarket.com',
			'https://api.shecaresmarket.com'
		],
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		exposedHeaders: ['X-Total-Count'],
		credentials: true,
		maxAge: 86400 // 24 hours
	}
};

/**
 * Security headers configuration
 */
const securityHeadersConfig = {
	development: {
		contentSecurityPolicy: false,
		xssProtection: true,
		noSniff: true,
		frameOptions: 'DENY'
	},
	test: {
		contentSecurityPolicy: false,
		xssProtection: true,
		noSniff: true,
		frameOptions: 'DENY'
	},
	production: {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
				styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
				fontSrc: ["'self'", 'fonts.gstatic.com'],
				imgSrc: ["'self'", 'data:', 'https://shecaresmarket-uploads.s3.amazonaws.com'],
				connectSrc: ["'self'", 'api.shecaresmarket.com']
			}
		},
		xssProtection: true,
		noSniff: true,
		frameOptions: 'DENY'
	}
};

/**
 * Authentication strategies configuration
 */
const authStrategiesConfig = {
	local: {
		enabled: true
	},
	google: {
		enabled: process.env.GOOGLE_AUTH_ENABLED === 'true',
		clientID: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURL: process.env.GOOGLE_CALLBACK_URL
	},
	facebook: {
		enabled: process.env.FACEBOOK_AUTH_ENABLED === 'true',
		clientID: process.env.FACEBOOK_CLIENT_ID,
		clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
		callbackURL: process.env.FACEBOOK_CALLBACK_URL
	}
};

module.exports = {
	jwt: jwtConfig[env],
	password: passwordConfig,
	rateLimit: rateLimitConfig[env],
	cors: corsConfig[env],
	securityHeaders: securityHeadersConfig[env],
	authStrategies: authStrategiesConfig,

	// Convenience properties
	get jwtSecret() {
		return this.jwt.secret;
	},

	get jwtExpiresIn() {
		return this.jwt.expiresIn;
	}
};
