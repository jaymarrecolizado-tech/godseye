/**
 * User Management Controller
 * Handles CRUD operations for user management (Admin only)
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../config/database');
const { sendSuccess, sendError, STATUS_CODES, ERROR_MESSAGES } = require('../utils/response');
const { manualAuditLog } = require('../middleware/auditLogger');
const notificationService = require('../services/notificationService');

// Valid roles in system
const VALID_ROLES = ['Admin', 'Manager', 'Editor', 'Viewer'];

/**
 * Get all users with pagination and filters
 * GET /api/users
 * Admin only
 */
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      status = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Build where clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (role && VALID_ROLES.includes(role)) {
      whereClause += ` AND role = ?`;
      params.push(role);
    }

    if (status !== '') {
      const isActive = status === 'active' ? 1 : 0;
      whereClause += ` AND is_active = ?`;
      params.push(isActive);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = ['id', 'username', 'email', 'full_name', 'role', 'is_active', 'created_at', 'last_login'];
    const orderColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const orderDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get users
    const users = await query(
      `SELECT id, username, email, full_name, role, is_active, created_at, last_login
       FROM users
       ${whereClause}
       ORDER BY ${orderColumn} ${orderDirection}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Format user data
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isActive: user.is_active === 1,
      createdAt: user.created_at,
      lastLogin: user.last_login
    }));

    const totalPages = Math.ceil(total / limit);

    return sendSuccess(
      res,
      {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      'Users retrieved successfully',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Get all users error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;

    // Check permissions - admin can view any user, others can only view themselves
    if (currentUserRole !== 'Admin' && parseInt(id) !== currentUserId) {
      return sendError(
        res,
        'Forbidden',
        ERROR_MESSAGES.FORBIDDEN,
        STATUS_CODES.FORBIDDEN
      );
    }

    const users = await query(
      `SELECT id, username, email, full_name, role, is_active, created_at, last_login
       FROM users
       WHERE id = ?`,
      [id]
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

    return sendSuccess(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      'User retrieved successfully',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Get user by ID error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Create new user
 * POST /api/users
 * Admin only
 */
const createUser = async (req, res) => {
  try {
    const { username, email, fullName, role, isActive = true } = req.body;

    // Validation
    if (!username || !email || !fullName || !role) {
      return sendError(
        res,
        'Validation Error',
        'Username, email, full name, and role are required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return sendError(
        res,
        'Validation Error',
        `Role must be one of: ${VALID_ROLES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if username already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser.length > 0) {
      return sendError(
        res,
        'Conflict',
        'Username already exists',
        STATUS_CODES.CONFLICT
      );
    }

    // Check if email already exists
    const existingEmail = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingEmail.length > 0) {
      return sendError(
        res,
        'Conflict',
        'Email already exists',
        STATUS_CODES.CONFLICT
      );
    }

    // Generate cryptographically secure random password
    const tempPassword = crypto.randomBytes(24).toString('base64');

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    // Insert user
    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, passwordHash, fullName, role, isActive ? 1 : 0]
    );

    const newUserId = result.insertId;

    // Get created user
    const newUser = await query(
      `SELECT id, username, email, full_name, role, is_active, created_at
       FROM users WHERE id = ?`,
      [newUserId]
    );

    const user = newUser[0];

    // Log audit
    await manualAuditLog(
      'CREATE',
      'users',
      newUserId,
      null,
      {
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active === 1
      },
      req
    );

    // Notify other admins about new user
    notificationService.notifyUserCreated({
      id: newUserId,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      email: user.email
    }, req.user.userId).catch(error => {
      console.error('Error sending user creation notification:', error);
    });

    return sendSuccess(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active === 1,
        createdAt: user.created_at
      },
      'User created successfully',
      STATUS_CODES.CREATED
    );
  } catch (error) {
    console.error('Create user error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Update user
 * PUT /api/users/:id
 * Admin or self
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, fullName } = req.body;
    const currentUserId = req.user.userId;
    const currentUserRole = req.user.role;

    // Check permissions - admin can update any user, others can only update themselves
    if (currentUserRole !== 'Admin' && parseInt(id) !== currentUserId) {
      return sendError(
        res,
        'Forbidden',
        ERROR_MESSAGES.FORBIDDEN,
        STATUS_CODES.FORBIDDEN
      );
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!existingUser || existingUser.length === 0) {
      return sendError(
        res,
        'Not Found',
        ERROR_MESSAGES.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    const oldData = existingUser[0];

    // Check if email is being changed and if it already exists
    if (email && email !== oldData.email) {
      const emailExists = await query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );

      if (emailExists.length > 0) {
        return sendError(
          res,
          'Conflict',
          'Email already exists',
          STATUS_CODES.CONFLICT
        );
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    if (fullName !== undefined) {
      updates.push('full_name = ?');
      params.push(fullName);
    }

    if (updates.length === 0) {
      return sendError(
        res,
        'Validation Error',
        'No fields to update',
        STATUS_CODES.BAD_REQUEST
      );
    }

    params.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated user
    const updatedUser = await query(
      `SELECT id, username, email, full_name, role, is_active, created_at, last_login
       FROM users WHERE id = ?`,
      [id]
    );

    const user = updatedUser[0];

    // Log audit
    await manualAuditLog(
      'UPDATE',
      'users',
      parseInt(id),
      {
        email: oldData.email,
        fullName: oldData.full_name
      },
      {
        email: user.email,
        fullName: user.full_name
      },
      req
    );

    return sendSuccess(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      'User updated successfully',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Update user error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Update user role
 * PUT /api/users/:id/role
 * Admin only
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.userId;

    // Prevent admin from changing their own role
    if (parseInt(id) === currentUserId) {
      return sendError(
        res,
        'Forbidden',
        'You cannot change your own role',
        STATUS_CODES.FORBIDDEN
      );
    }

    // Validation
    if (!role || !VALID_ROLES.includes(role)) {
      return sendError(
        res,
        'Validation Error',
        `Role must be one of: ${VALID_ROLES.join(', ')}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!existingUser || existingUser.length === 0) {
      return sendError(
        res,
        'Not Found',
        ERROR_MESSAGES.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    const oldData = existingUser[0];

    // Update role
    await query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );

    // Get updated user
    const updatedUser = await query(
      `SELECT id, username, email, full_name, role, is_active, created_at, last_login
       FROM users WHERE id = ?`,
      [id]
    );

    const user = updatedUser[0];

    // Log audit
    await manualAuditLog(
      'UPDATE',
      'users',
      parseInt(id),
      { role: oldData.role },
      { role: user.role },
      req
    );

    return sendSuccess(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      'User role updated successfully',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Update user role error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Update user status (activate/deactivate)
 * PUT /api/users/:id/status
 * Admin only
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const currentUserId = req.user.userId;

    // Prevent admin from deactivating themselves
    if (parseInt(id) === currentUserId) {
      return sendError(
        res,
        'Forbidden',
        'You cannot change your own status',
        STATUS_CODES.FORBIDDEN
      );
    }

    // Validation
    if (isActive === undefined || isActive === null) {
      return sendError(
        res,
        'Validation Error',
        'isActive field is required',
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!existingUser || existingUser.length === 0) {
      return sendError(
        res,
        'Not Found',
        ERROR_MESSAGES.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    const oldData = existingUser[0];

    // Update status
    await query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );

    // Get updated user
    const updatedUser = await query(
      `SELECT id, username, email, full_name, role, is_active, created_at, last_login
       FROM users WHERE id = ?`,
      [id]
    );

    const user = updatedUser[0];

    // Log audit
    await manualAuditLog(
      'UPDATE',
      'users',
      parseInt(id),
      { isActive: oldData.is_active === 1 },
      { isActive: user.is_active === 1 },
      req
    );

    const statusText = isActive ? 'activated' : 'deactivated';

    return sendSuccess(
      res,
      {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      `User ${statusText} successfully`,
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Update user status error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Delete user
 * DELETE /api/users/:id
 * Admin only
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    // Prevent admin from deleting themselves
    if (parseInt(id) === currentUserId) {
      return sendError(
        res,
        'Forbidden',
        'You cannot delete your own account',
        STATUS_CODES.FORBIDDEN
      );
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!existingUser || existingUser.length === 0) {
      return sendError(
        res,
        'Not Found',
        ERROR_MESSAGES.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    const userData = existingUser[0];

    // Delete user
    await query('DELETE FROM users WHERE id = ?', [id]);

    // Log audit
    await manualAuditLog(
      'DELETE',
      'users',
      parseInt(id),
      {
        username: userData.username,
        email: userData.email,
        fullName: userData.full_name,
        role: userData.role,
        isActive: userData.is_active === 1
      },
      null,
      req
    );

    return sendSuccess(
      res,
      null,
      'User deleted successfully',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Delete user error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Reset user password
 * POST /api/users/:id/reset-password
 * Admin only
 */
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.userId;

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!existingUser || existingUser.length === 0) {
      return sendError(
        res,
        'Not Found',
        ERROR_MESSAGES.NOT_FOUND,
        STATUS_CODES.NOT_FOUND
      );
    }

    const userData = existingUser[0];

    // Generate cryptographically secure random password
    const newPassword = crypto.randomBytes(24).toString('base64');

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, id]
    );

    // Log audit
    await manualAuditLog(
      'UPDATE',
      'users',
      parseInt(id),
      { action: 'password_reset' },
      { message: 'Password was reset by admin' },
      req
    );

    return sendSuccess(
      res,
      null,
      `Password reset successfully for user "${userData.username}"`,
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Get user roles summary (for dropdowns/filters)
 * GET /api/users/roles
 */
const getUserRoles = async (req, res) => {
  try {
    return sendSuccess(
      res,
      VALID_ROLES.map(role => ({
        value: role,
        label: role
      })),
      'User roles retrieved successfully',
      STATUS_CODES.OK
    );
  } catch (error) {
    console.error('Get user roles error:', error);
    return sendError(
      res,
      'Internal Server Error',
      ERROR_MESSAGES.INTERNAL_ERROR,
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  resetPassword,
  getUserRoles
};
