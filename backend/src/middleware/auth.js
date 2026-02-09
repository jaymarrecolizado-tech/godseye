/**
 * Authentication Middleware
 * JWT token verification and Role-Based Access Control (RBAC)
 */

const jwt = require('jsonwebtoken');
const { sendError, STATUS_CODES, ERROR_MESSAGES } = require('../utils/response');
const authConfig = require('../config/auth');

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} JWT token or null
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Check for Bearer token format
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Authenticate JWT token middleware
 * Verifies the JWT token from Authorization header
 * Sets req.user with decoded token payload
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return sendError(
        res,
        'Unauthorized',
        'Access token is required. Please provide a valid Bearer token in the Authorization header.',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // Verify token
    jwt.verify(token, authConfig.JWT_SECRET, (err, decoded) => {
      if (err) {
        // Handle specific JWT errors
        if (err.name === 'TokenExpiredError') {
          return sendError(
            res,
            'Unauthorized',
            'Token has expired. Please refresh your token or login again.',
            STATUS_CODES.UNAUTHORIZED
          );
        }

        if (err.name === 'JsonWebTokenError') {
          return sendError(
            res,
            'Unauthorized',
            'Invalid token format.',
            STATUS_CODES.UNAUTHORIZED
          );
        }

        return sendError(
          res,
          'Unauthorized',
          'Invalid token.',
          STATUS_CODES.UNAUTHORIZED
        );
      }

      // Set user info on request object
      req.user = decoded;
      
      // Continue to next middleware/route handler
      next();
    });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Require Role middleware - RBAC
 * Restricts access to users with specific roles
 * 
 * @param {string|string[]} roles - Required role(s) 
 * @returns {Function} Express middleware function
 * 
 * Usage:
 *   router.get('/admin-only', authenticateToken, requireRole('Admin'), handler);
 *   router.get('/manager-plus', authenticateToken, requireRole(['Admin', 'Manager']), handler);
 */
const requireRole = (roles) => {
  // Normalize roles to array
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        return sendError(
          res,
          'Unauthorized',
          'Authentication required.',
          STATUS_CODES.UNAUTHORIZED
        );
      }

      const userRole = req.user.role;

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        return sendError(
          res,
          'Forbidden',
          ERROR_MESSAGES.FORBIDDEN,
          STATUS_CODES.FORBIDDEN
        );
      }

      // User has required role, continue
      next();
    } catch (error) {
      console.error('Role check middleware error:', error);
      return sendError(
        res,
        'Internal Server Error',
        ERROR_MESSAGES.INTERNAL_ERROR,
        STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  };
};

/**
 * Optional authentication middleware
 * Sets req.user if token is valid, but doesn't require it
 * Useful for routes that work for both authenticated and anonymous users
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      // No token provided, continue without user
      return next();
    }

    // Verify token (ignore expiration for optional auth)
    jwt.verify(token, authConfig.JWT_SECRET, { ignoreExpiration: false }, (err, decoded) => {
      if (!err) {
        // Token is valid, set user
        req.user = decoded;
      }
      // Continue regardless of token validity
      next();
    });
  } catch (error) {
    // Continue on error
    next();
  }
};

/**
 * Role hierarchy helper
 * Returns true if userRole has at least the required role level
 * Admin > Manager > Editor > Viewer
 * 
 * @param {string} userRole - User's current role
 * @param {string} requiredRole - Minimum required role
 * @returns {boolean} Whether user has sufficient privileges
 */
const hasRoleLevel = (userRole, requiredRole) => {
  const roleHierarchy = {
    'Admin': 4,
    'Manager': 3,
    'Editor': 2,
    'Viewer': 1
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
};

/**
 * Require minimum role level middleware
 * Allows access to users with the specified role or higher
 * 
 * @param {string} minRole - Minimum required role level
 * @returns {Function} Express middleware function
 * 
 * Usage:
 *   router.get('/editor-plus', authenticateToken, requireMinRole('Editor'), handler);
 */
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        return sendError(
          res,
          'Unauthorized',
          'Authentication required.',
          STATUS_CODES.UNAUTHORIZED
        );
      }

      const userRole = req.user.role;

      // Check if user has at least the minimum role level
      if (!hasRoleLevel(userRole, minRole)) {
        return sendError(
          res,
          'Forbidden',
          ERROR_MESSAGES.FORBIDDEN,
          STATUS_CODES.FORBIDDEN
        );
      }

      // User has required role level, continue
      next();
    } catch (error) {
      console.error('Min role check middleware error:', error);
      return sendError(
        res,
        'Internal Server Error',
        ERROR_MESSAGES.INTERNAL_ERROR,
        STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  };
};

/**
 * Require ownership or admin middleware
 * Allows access if user owns the resource or is an admin
 * 
 * @param {Function} getResourceOwner - Async function that returns the resource owner userId
 * @returns {Function} Express middleware function
 */
const requireOwnerOrAdmin = (getResourceOwner) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        return sendError(
          res,
          'Unauthorized',
          'Authentication required.',
          STATUS_CODES.UNAUTHORIZED
        );
      }

      // Admin can access any resource
      if (req.user.role === 'Admin') {
        return next();
      }

      // Get resource owner
      const ownerId = await getResourceOwner(req);

      // Check if user owns the resource
      if (ownerId && ownerId === req.user.userId) {
        return next();
      }

      // User doesn't own the resource and isn't admin
      return sendError(
        res,
        'Forbidden',
        ERROR_MESSAGES.FORBIDDEN,
        STATUS_CODES.FORBIDDEN
      );
    } catch (error) {
      console.error('Ownership check middleware error:', error);
      return sendError(
        res,
        'Internal Server Error',
        ERROR_MESSAGES.INTERNAL_ERROR,
        STATUS_CODES.INTERNAL_SERVER_ERROR
      );
    }
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireMinRole,
  optionalAuth,
  requireOwnerOrAdmin,
  hasRoleLevel,
  extractToken
};
