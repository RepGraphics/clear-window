const rateLimit = require('express-rate-limit');

// General API rate limiter
exports.rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 250, // Limit each IP to 250 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login/signup requests per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes'
    },
    skipSuccessfulRequests: true
});

// Email verification rate limiter
exports.emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit to 3 email verification requests per hour
    message: {
        success: false,
        message: 'Too many verification emails sent, please try again later'
    }
});
