/**
 * Authentication Routes
 * Security Audit Remediation - Rate Limiting Added
 * Public routes for user authentication
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controller
const authController = require('../controllers/auth.controller');

// Import middleware
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { authRateLimiter } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public (rate limited)
 * @body    { username: string, password: string }
 * @returns { accessToken: string, refreshToken: string, user: object }
 */
router.post('/login', authRateLimiter, [
  // Validation rules
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),
  
  // Handle validation errors
  handleValidationErrors
], authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Public (but requires valid refresh token)
 * @body    { refreshToken: string }
 * @returns { message: string }
 */
router.post('/logout', [
  // Validation rules
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  
  // Handle validation errors
  handleValidationErrors
], authController.logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (rate limited, requires valid refresh token)
 * @body    { refreshToken: string }
 * @returns { accessToken: string }
 */
router.post('/refresh', authRateLimiter, [
  // Validation rules
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  
  // Handle validation errors
  handleValidationErrors
], authController.refresh);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (requires valid access token)
 * @header  Authorization: Bearer <token>
 * @returns { user: object }
 */
router.get('/me', authenticateToken, authController.getMe);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private (requires valid access token)
 * @header  Authorization: Bearer <token>
 * @body    { currentPassword: string, newPassword: string }
 * @returns { message: string }
 */
router.post('/change-password', [
  // Authentication required
  authenticateToken,
  
  // Validation rules
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 12, max: 128 })
    .withMessage('New password must be between 12 and 128 characters long'),
  
  // Handle validation errors
  handleValidationErrors
], authController.changePassword);

module.exports = router;
