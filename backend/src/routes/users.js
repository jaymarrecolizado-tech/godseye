/**
 * User Management Routes
 * Admin-only routes for managing system users
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controller
const userController = require('../controllers/user.controller');

// Import middleware
const { authenticateToken, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// All routes require authentication and Admin role
router.use(authenticateToken);
router.use(requireRole('Admin'));

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filters
 * @access  Admin only
 * @query   { page, limit, search, role, status, sortBy, sortOrder }
 * @returns { users: array, pagination: object }
 */
router.get('/', userController.getAllUsers);

/**
 * @route   GET /api/users/roles
 * @desc    Get list of available user roles
 * @access  Admin only
 * @returns { roles: array }
 */
router.get('/roles', userController.getUserRoles);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin or self
 * @params  { id }
 * @returns { user: object }
 */
router.get('/:id', userController.getUserById);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Admin only
 * @body    { username: string, email: string, fullName: string, role: string, isActive: boolean }
 * @returns { user: object }
 */
router.post('/', [
  // Validation rules
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['Admin', 'Manager', 'Editor', 'Viewer'])
    .withMessage('Role must be one of: Admin, Manager, Editor, Viewer'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  // Handle validation errors
  handleValidationErrors
], userController.createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (email and fullName only)
 * @access  Admin or self
 * @params  { id }
 * @body    { email: string, fullName: string }
 * @returns { user: object }
 */
router.put('/:id', [
  // Validation rules
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  // Handle validation errors
  handleValidationErrors
], userController.updateUser);

/**
 * @route   PUT /api/users/:id/role
 * @desc    Change user role
 * @access  Admin only
 * @params  { id }
 * @body    { role: string }
 * @returns { user: object }
 */
router.put('/:id/role', [
  // Validation rules
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['Admin', 'Manager', 'Editor', 'Viewer'])
    .withMessage('Role must be one of: Admin, Manager, Editor, Viewer'),

  // Handle validation errors
  handleValidationErrors
], userController.updateUserRole);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Activate or deactivate user
 * @access  Admin only
 * @params  { id }
 * @body    { isActive: boolean }
 * @returns { user: object }
 */
router.put('/:id/status', [
  // Validation rules
  body('isActive')
    .notEmpty()
    .withMessage('isActive is required')
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  // Handle validation errors
  handleValidationErrors
], userController.updateUserStatus);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Admin only
 * @params  { id }
 * @returns { message: string }
 */
router.delete('/:id', userController.deleteUser);

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password (generates new random password)
 * @access  Admin only
 * @params  { id }
 * @returns { message: string, newPassword: string }
 */
router.post('/:id/reset-password', userController.resetPassword);

module.exports = router;
