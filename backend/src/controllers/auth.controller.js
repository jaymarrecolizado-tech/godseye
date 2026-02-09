/**
 * Authentication Controller
 * Security Audit Remediation - Complete Rewrite
 * Handles user authentication, token generation, and session management
 * 
 * Fixes Implemented:
 * - CRITICAL-002: Removed hardcoded JWT secret fallback
 * - HIGH-002: Implemented account lockout mechanism
 * - HIGH-004: Migrated refresh tokens from in-memory to database
 * - MEDIUM-001: Strengthened password policy
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { sendSuccess, sendError, STATUS_CODES, ERROR_MESSAGES } = require('../utils/response');
const authConfig = require('../config/auth');
const { validatePasswordStrength, calculatePasswordStrength } = require('../utils/passwordValidator');
const { 
  storeRefreshToken, 
  validateRefreshToken, 
  revokeRefreshToken, 
  revokeAllUserTokens,
  cleanupExpiredTokens
} = require('../utils/tokenStorage');

/**
 * Generate access token
 * @param {Object} payload - Token payload
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, authConfig.JWT_SECRET, { expiresIn: authConfig.JWT_EXPIRES_IN });
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, authConfig.JWT_SECRET, { expiresIn: authConfig.JWT_REFRESH_EXPIRES_IN });
};

/**
 * Check if account is locked
 * @param {Object} user - User object from database
 * @returns {boolean} True if account is locked
 */
const isAccountLocked = (user) => {
  if (!user.locked_until) return false;
  const now = new Date();
  const lockedUntil = new Date(user.locked_until);
  return lockedUntil > now;
};

/**
 * Get remaining lockout time in minutes
 * @param {Object} user - User object from database
 * @returns {number} Remaining minutes
 */
const getLockoutRemainingMinutes = (user) => {
  if (!user.locked_until) return 0;
  const now = new Date();
  const lockedUntil = new Date(user.locked_until);
  if (lockedUntil <= now) return 0;
  return Math.ceil((lockedUntil - now) / 60000);
};

/**
 * Increment failed login attempts
 * @param {number} userId - User ID
 * @param {number} currentAttempts - Current failed attempt count
 */
const incrementFailedAttempts = async (userId, currentAttempts) => {
  const newAttempts = currentAttempts + 1;
  
  if (newAttempts >= authConfig.MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + authConfig.LOCKOUT_DURATION_MINUTES * 60 * 1000);
    await query(
      `UPDATE users 
       SET failed_login_attempts = ?, 
           locked_until = ? 
       WHERE id = ?`,
      [newAttempts, lockedUntil, userId]
    );
  } else {
    await query(
      `UPDATE users SET failed_login_attempts = ? WHERE id = ?`,
      [newAttempts, userId]
    );
  }
};

/**
 * Reset failed login attempts on successful login
 * @param {number} userId - User ID
 */
const resetFailedAttempts = async (userId) => {
  await query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
    [userId]
  );
};

/**
 * Login user
 * POST /api/auth/login
 * 
 * Security Features:
 * - Rate limiting (applied at route level)
 * - Account lockout after failed attempts
 * - Secure password verification with bcrypt
 * - Persistent refresh token storage
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return sendError(
        res,
        'Validation Error',
        'Username and password are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    const users = await query(
      `SELECT id, username, email, password_hash, full_name, role, is_active, 
              failed_login_attempts, locked_until
       FROM users
       WHERE username = ? AND is_active = TRUE`,
      [username]
    );

    if (!users || users.length === 0) {
      return sendError(
        res,
        'Authentication Failed',
        'Invalid username or password',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    const user = users[0];

    if (isAccountLocked(user)) {
      const remainingMinutes = getLockoutRemainingMinutes(user);
      return sendError(
        res,
        'Account Locked',
        `Too many failed login attempts. Please try again in ${remainingMinutes} minutes.`,
        STATUS_CODES.LOCKED
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      await incrementFailedAttempts(user.id, user.failed_login_attempts);
      return sendError(
        res,
        'Authentication Failed',
        'Invalid username or password',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    await resetFailedAttempts(user.id);

    try {
      await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    } catch (updateErr) {
      console.log('Note: Could not update last_login timestamp');
    }

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    const expiresInMs = 7 * 24 * 60 * 60 * 1000;
    await storeRefreshToken(user.id, refreshToken, expiresInMs);

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

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
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

    if (!refreshToken) {
      return sendError(
        res,
        'Validation Error',
        'Refresh token is required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, authConfig.JWT_SECRET);
    } catch (err) {
      await revokeRefreshToken(refreshToken);
      return sendError(
        res,
        'Authentication Failed',
        'Invalid or expired refresh token',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    const storedToken = await validateRefreshToken(refreshToken);

    if (!storedToken) {
      return sendError(
        res,
        'Authentication Failed',
        'Invalid or expired refresh token',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    if (!storedToken.is_active) {
      await revokeRefreshToken(refreshToken);
      return sendError(
        res,
        'Authentication Failed',
        'User account is inactive',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    const tokenPayload = {
      userId: storedToken.user_id,
      username: storedToken.username,
      email: storedToken.email,
      role: storedToken.role,
      fullName: storedToken.full_name
    };

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
 * Change password
 * POST /api/auth/change-password
 * 
 * Security Features:
 * - Strong password validation (12+ chars, complexity requirements)
 * - Common password detection
 * - Password strength calculation
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(
        res,
        'Validation Error',
        'Current password and new password are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return sendError(
        res,
        'Validation Error',
        passwordError,
        STATUS_CODES.BAD_REQUEST
      );
    }

    const users = await query(
      'SELECT username, email, password_hash FROM users WHERE id = ? AND is_active = TRUE',
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

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);

    if (!isPasswordValid) {
      return sendError(
        res,
        'Authentication Failed',
        'Current password is incorrect',
        STATUS_CODES.UNAUTHORIZED
      );
    }

    const passwordStrength = calculatePasswordStrength(newPassword);
    if (passwordStrength === 'weak') {
      return sendError(
        res,
        'Validation Error',
        'Password strength is weak. Please choose a stronger password.',
        STATUS_CODES.BAD_REQUEST
      );
    }

    const saltRounds = authConfig.BCRYPT_ROUNDS;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );

    await revokeAllUserTokens(userId);

    return sendSuccess(
      res,
      { strength: passwordStrength },
      'Password changed successfully. Please login again.',
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
