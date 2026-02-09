/**
 * CSRF Protection Middleware
 * Security Audit Remediation (MEDIUM-002)
 * Prevents Cross-Site Request Forgery attacks
 */

const crypto = require('crypto');
const { sendError, STATUS_CODES } = require('../utils/response');
const authConfig = require('../config/auth');

const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const csrfProtection = (req, res, next) => {
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.cookies?.csrf_token;

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const csrfToken = sessionToken || generateCSRFToken();
    
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: authConfig.CSRF_COOKIE_SECURE,
      sameSite: authConfig.CSRF_COOKIE_SAME_SITE,
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.locals.csrfToken = csrfToken;
    return next();
  }

  if (!token || token !== sessionToken) {
    return sendError(
      res,
      'Forbidden',
      'Invalid or missing CSRF token. Please refresh the page and try again.',
      STATUS_CODES.FORBIDDEN
    );
  }

  next();
};

const validateCSRFToken = (req, res, next) => {
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.cookies?.csrf_token;

  if (!token || token !== sessionToken) {
    return sendError(
      res,
      'Forbidden',
      'Invalid or missing CSRF token.',
      STATUS_CODES.FORBIDDEN
    );
  }

  next();
};

module.exports = {
  csrfProtection,
  validateCSRFToken,
  generateCSRFToken
};
