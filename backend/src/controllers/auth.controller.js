/**
 * Authentication Controller
 * Handles user authentication, token generation, and session management
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { sendSuccess, sendError, STATUS_CODES, ERROR_MESSAGES } = require('../utils/response');

// Token configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// In-memory refresh token store (consider using Redis in production)
const refreshTokens = new Set();

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return sendError(
        res,
        'Validation Error',
        'Username and password are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Query user from database
    const users = await query(
      `SELECT id, username, email, password_hash, full_name, role, is_active
       FROM users
       WHERE username = ? AND is_active = TRUE`,
      [username]
    );

    // Check if user exists
    if (!users || users.length === 0) {
      return sendError(
        res,
        'Authentication Failed',
        'Invalid username or password',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return sendError(
        res,
        'Authentication Failed',
        'Invalid username or password',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // Update last login timestamp (optional - don't fail if column doesn't exist)
    try {
      await query(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [user.id]
      );
    } catch (updateErr) {
      // Silently ignore last_login update errors
      console.log('Note: Could not update last_login timestamp');
    }

    // Create token payload
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    };

    // Generate tokens
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token
    refreshTokens.add(refreshToken);

    // Prepare user data (exclude sensitive info)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role
    };

    return sendSuccess(
      res,
      {
        accessToken,
        refreshToken,
        user: userData
      },
      'Login successful',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Login error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Remove refresh token from store
    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }

    return sendSuccess(
      res,
      null,
      'Logout successful',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Logout error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Validate input
    if (!refreshToken) {
      return sendError(
        res,
        'Validation Error',
        'Refresh token is required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if refresh token exists in store
    if (!refreshTokens.has(refreshToken)) {
      return sendError(
        res,
        'Authentication Failed',
        'Invalid or expired refresh token',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      // Remove invalid token from store
      refreshTokens.delete(refreshToken);
      return sendError(
        res,
        'Authentication Failed',
        'Invalid or expired refresh token',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // Get user from database
    const users = await query(
      `SELECT id, username, email, full_name, role, is_active 
       FROM users 
       WHERE id = ? AND is_active = TRUE`,
      [decoded.userId]
    );

    if (!users || users.length === 0) {
      refreshTokens.delete(refreshToken);
      return sendError(
        res,
        'Authentication Failed',
        'User not found or inactive',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    const user = users[0];

    // Create new token payload
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    };

    // Generate new access token
    const newAccessToken = generateAccessToken(tokenPayload);

    return sendSuccess(
      res,
      {
        accessToken: newAccessToken
      },
      'Token refreshed successfully',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Refresh token error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user from database
    const users = await query(
      `SELECT id, username, email, full_name, role, is_active, last_login, created_at 
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      return sendError(
        res,
        'Not Found',
        ERROR_MESSAGES.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    const user = users[0];

    // Prepare user data
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isActive: user.is_active === 1,
      lastLogin: user.last_login,
      createdAt: user.created_at
    };

    return sendSuccess(
      res,
      userData,
      'User profile retrieved successfully',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Get user profile error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Change password (optional helper)
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return sendError(
        res,
        'Validation Error',
        'Current password and new password are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return sendError(
        res,
        'Validation Error',
        'New password must be at least 8 characters long',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Get user's current password hash
    const users = await query(
      'SELECT password_hash FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );

    if (!users || users.length === 0) {
      return sendError(
        res,
        'Not Found',
        'User not found',
        STATUS_CODES.NOT_FOUND
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);

    if (!isPasswordValid) {
      return sendError(
        res,
        'Authentication Failed',
        'Current password is incorrect',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );

    return sendSuccess(
      res,
      null,
      'Password changed successfully',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Change password error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

module.exports = {
  login,
  logout,
  refresh,
  getMe,
  changePassword,
  generateAccessToken,
  generateRefreshToken
};
