/**
 * Security Event Logger Middleware
 * Security Audit Remediation (SEC-010)
 * Logs security-relevant events for monitoring and incident response
 */

const { query } = require('../config/database');

const SECURITY_EVENTS = {
  AUTH_FAILURE: 'auth_failure',
  AUTH_LOCKOUT: 'auth_lockout',
  CSRF_FAILURE: 'csrf_failure',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_INPUT: 'suspicious_input',
  FILE_UPLOAD_REJECTED: 'file_upload_rejected',
  PERMISSION_DENIED: 'permission_denied'
};

const logSecurityEvent = async (eventType, details) => {
  try {
    const {
      ip,
      userId,
      userAgent,
      path,
      method,
      statusCode,
      reason,
      additionalData
    } = details;

    await query(
      `INSERT INTO security_events 
       (event_type, ip_address, user_id, user_agent, path, method, status_code, reason, additional_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        eventType,
        ip || null,
        userId || null,
        userAgent ? userAgent.substring(0, 500) : null,
        path || null,
        method || null,
        statusCode || null,
        reason || null,
        additionalData ? JSON.stringify(additionalData) : null
      ]
    );
  } catch (error) {
    console.error('[SECURITY LOG ERROR]', error);
  }
};

const securityLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const userId = req.user?.userId;

    if (statusCode === 401) {
      logSecurityEvent(SECURITY_EVENTS.AUTH_FAILURE, {
        ip,
        userId,
        userAgent,
        path: req.path,
        method: req.method,
        statusCode,
        reason: 'Authentication failed or missing',
        additionalData: { duration }
      }).catch(() => {});
      console.warn(`[SECURITY] Unauthorized access attempt - IP: ${ip}, Path: ${req.path}`);
    }

    if (statusCode === 403) {
      logSecurityEvent(SECURITY_EVENTS.PERMISSION_DENIED, {
        ip,
        userId,
        userAgent,
        path: req.path,
        method: req.method,
        statusCode,
        reason: 'Permission denied',
        additionalData: { duration, role: req.user?.role }
      }).catch(() => {});
      console.warn(`[SECURITY] Permission denied - IP: ${ip}, User: ${userId}, Path: ${req.path}`);
    }

    if (statusCode === 429) {
      logSecurityEvent(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, {
        ip,
        userId,
        userAgent,
        path: req.path,
        method: req.method,
        statusCode,
        reason: 'Rate limit exceeded',
        additionalData: { duration }
      }).catch(() => {});
      console.warn(`[SECURITY] Rate limit exceeded - IP: ${ip}, Path: ${req.path}`);
    }
  });

  next();
};

const logCSRFEvent = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  
  logSecurityEvent(SECURITY_EVENTS.CSRF_FAILURE, {
    ip,
    userId: req.user?.userId,
    userAgent,
    path: req.path,
    method: req.method,
    statusCode: 403,
    reason: 'Invalid or missing CSRF token'
  }).catch(() => {});
  
  console.warn(`[SECURITY] CSRF validation failed - IP: ${ip}, Path: ${req.path}`);
  
  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'Invalid or missing CSRF token'
  });
};

const logSuspiciousInput = (req, field, pattern) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  logSecurityEvent(SECURITY_EVENTS.SUSPICIOUS_INPUT, {
    ip,
    userId: req.user?.userId,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    statusCode: 400,
    reason: `Suspicious pattern detected in field: ${field}`,
    additionalData: { field, pattern }
  }).catch(() => {});
  
  console.warn(`[SECURITY] Suspicious input detected - IP: ${ip}, Field: ${field}`);
};

const logAuthLockout = (req, userId) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  logSecurityEvent(SECURITY_EVENTS.AUTH_LOCKOUT, {
    ip,
    userId,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    statusCode: 423,
    reason: 'Account locked due to too many failed login attempts'
  }).catch(() => {});
  
  console.warn(`[SECURITY] Account lockout - IP: ${ip}, User: ${userId}`);
};

module.exports = {
  securityLogger,
  logSecurityEvent,
  logCSRFEvent,
  logSuspiciousInput,
  logAuthLockout,
  SECURITY_EVENTS
};
