/**
 * Rate Limiting Middleware
 * Security Audit Remediation (HIGH-001, HIGH-005)
 * Prevents brute force attacks and DoS attempts
 */

const rateLimit = require('express-rate-limit');
const { sendError, STATUS_CODES } = require('../utils/response');
const authConfig = require('../config/auth');

const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || authConfig.RATE_LIMIT_WINDOW_MS,
    max: options.max || authConfig.RATE_LIMIT_MAX_ATTEMPTS,
    message: options.message || {
      success: false,
      error: 'Too Many Requests',
      message: 'Too many requests from this IP. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    keyGenerator: options.keyGenerator || function(req) {
      return req.ip || req.connection.remoteAddress;
    }
  });
};

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  skipSuccessfulRequests: false
});

const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many API requests. Please slow down.'
  },
  skipSuccessfulRequests: false
});

const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many upload attempts. Please wait before uploading again.'
  },
  skipSuccessfulRequests: false
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  uploadRateLimiter
};
