/**
 * Notification Service
 * Handles creation and delivery of notifications
 */

const { query } = require('../config/database');

/**
 * Helper function to safely parse JSON data
 * Handles cases where data is already an object or is a string
 * @param {*} data - Data to parse
 * @returns {Object|null} Parsed object or null
 */
const safeJsonParse = (data) => {
  if (data === null || data === undefined) return null;
  if (typeof data === 'object') return data;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to parse notification data:', data);
      return null;
    }
  }
  return null;
};

/**
 * Create a notification for a user
 * @param {Object} params - Notification parameters
 * @param {number} params.userId - Recipient user ID
 * @param {string} params.type - Notification type (project, import, user, system)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {Object} params.data - Additional JSON data
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async ({ userId, type, title, message, data = null }) => {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, FALSE, NOW())`,
      [userId, type, title, message, data ? JSON.stringify(data) : null]
    );

    const notificationId = result.insertId;

    // Get the created notification
    const [notification] = await query(
      `SELECT id, user_id, type, title, message, data, is_read, created_at
       FROM notifications WHERE id = ?`,
      [notificationId]
    );

    // Emit real-time notification via Socket.IO if available
    if (global.io) {
      global.io.to(`user:${userId}`).emit('notification:new', {
        ...notification,
        data: safeJsonParse(notification.data)
      });
    }

    return {
      ...notification,
      data: safeJsonParse(notification.data)
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create notifications for multiple users
 * @param {number[]} userIds - Array of recipient user IDs
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object[]>} Created notifications
 */
const createNotificationsForUsers = async (userIds, notificationData) => {
  const notifications = [];
  for (const userId of userIds) {
    try {
      const notification = await createNotification({
        userId,
        ...notificationData
      });
      notifications.push(notification);
    } catch (error) {
      console.error(`Error creating notification for user ${userId}:`, error);
    }
  }
  return notifications;
};

/**
 * Notify when a project is created
 * @param {Object} project - Project object
 * @param {number} userId - User who created the project
 * @param {number[]} [notifyUserIds] - Optional array of user IDs to notify (defaults to all admins and managers)
 */
const notifyProjectCreated = async (project, userId, notifyUserIds = null) => {
  try {
    let targetUserIds = notifyUserIds;

    // If no specific users provided, notify all admins and managers except the creator
    if (!targetUserIds) {
      const users = await query(
        `SELECT id FROM users WHERE role IN ('Admin', 'Manager') AND id != ? AND is_active = TRUE`,
        [userId]
      );
      targetUserIds = users.map(u => u.id);
    }

    await createNotificationsForUsers(targetUserIds, {
      type: 'project',
      title: 'New Project Created',
      message: `Project "${project.site_name}" (${project.site_code}) has been created`,
      data: {
        projectId: project.id,
        siteCode: project.site_code,
        siteName: project.site_name,
        status: project.status
      }
    });
  } catch (error) {
    console.error('Error notifying project creation:', error);
  }
};

/**
 * Notify when a project is updated
 * @param {Object} project - Project object
 * @param {Object} changes - Object containing changed fields
 * @param {number} userId - User who updated the project
 */
const notifyProjectUpdated = async (project, changes, userId) => {
  try {
    // Get users who should be notified (admins, managers, and the project creator if available)
    const users = await query(
      `SELECT id FROM users WHERE role IN ('Admin', 'Manager') AND id != ? AND is_active = TRUE`,
      [userId]
    );
    const targetUserIds = users.map(u => u.id);

    const changeDescriptions = [];
    if (changes.site_name !== undefined) changeDescriptions.push('site name');
    if (changes.site_code !== undefined) changeDescriptions.push('site code');
    if (changes.status !== undefined) changeDescriptions.push('status');
    if (changes.remarks !== undefined) changeDescriptions.push('remarks');
    if (changes.activation_date !== undefined) changeDescriptions.push('activation date');

    const changesText = changeDescriptions.length > 0
      ? changeDescriptions.join(', ')
      : 'details';

    await createNotificationsForUsers(targetUserIds, {
      type: 'project',
      title: 'Project Updated',
      message: `Project "${project.site_name}" (${project.site_code}) has been updated: ${changesText}`,
      data: {
        projectId: project.id,
        siteCode: project.site_code,
        siteName: project.site_name,
        changes: changeDescriptions
      }
    });
  } catch (error) {
    console.error('Error notifying project update:', error);
  }
};

/**
 * Notify when a project status changes
 * @param {Object} project - Project object
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {number} userId - User who changed the status
 */
const notifyProjectStatusChanged = async (project, oldStatus, newStatus, userId) => {
  try {
    // Get users who should be notified
    const users = await query(
      `SELECT id FROM users WHERE role IN ('Admin', 'Manager') AND id != ? AND is_active = TRUE`,
      [userId]
    );
    const targetUserIds = users.map(u => u.id);

    await createNotificationsForUsers(targetUserIds, {
      type: 'project',
      title: 'Project Status Changed',
      message: `Project "${project.site_name}" (${project.site_code}) status changed from "${oldStatus}" to "${newStatus}"`,
      data: {
        projectId: project.id,
        siteCode: project.site_code,
        siteName: project.site_name,
        oldStatus,
        newStatus
      }
    });
  } catch (error) {
    console.error('Error notifying project status change:', error);
  }
};

/**
 * Notify when an import job is completed
 * @param {Object} importJob - Import job object
 * @param {number} userId - User who initiated the import
 */
const notifyImportCompleted = async (importJob, userId) => {
  try {
    const isPartial = importJob.status === 'Partial';
    const hasErrors = importJob.error_count > 0;

    let title, message;
    if (isPartial) {
      title = 'Import Completed with Errors';
      message = `CSV import "${importJob.original_filename}" completed with ${importJob.error_count} error(s). ${importJob.success_count} row(s) imported successfully.`;
    } else if (hasErrors) {
      title = 'Import Failed';
      message = `CSV import "${importJob.original_filename}" failed with ${importJob.error_count} error(s).`;
    } else {
      title = 'Import Completed Successfully';
      message = `CSV import "${importJob.original_filename}" completed successfully. ${importJob.success_count} row(s) imported.`;
    }

    await createNotification({
      userId,
      type: 'import',
      title,
      message,
      data: {
        importId: importJob.id,
        filename: importJob.original_filename,
        status: importJob.status,
        successCount: importJob.success_count,
        errorCount: importJob.error_count,
        totalRows: importJob.total_rows
      }
    });
  } catch (error) {
    console.error('Error notifying import completion:', error);
  }
};

/**
 * Notify when a new user is created
 * @param {Object} user - User object
 * @param {number} adminId - Admin who created the user
 */
const notifyUserCreated = async (user, adminId) => {
  try {
    // Notify all admins except the creator
    const admins = await query(
      `SELECT id FROM users WHERE role = 'Admin' AND id != ? AND is_active = TRUE`,
      [adminId]
    );
    const targetUserIds = admins.map(u => u.id);

    await createNotificationsForUsers(targetUserIds, {
      type: 'user',
      title: 'New User Created',
      message: `New user "${user.fullName || user.username}" (${user.role}) has been created`,
      data: {
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error notifying user creation:', error);
  }
};

/**
 * Notify when a user is assigned to a project
 * @param {Object} project - Project object
 * @param {number} assignedUserId - User who was assigned
 * @param {number} assignerId - User who made the assignment
 */
const notifyUserAssigned = async (project, assignedUserId, assignerId) => {
  try {
    await createNotification({
      userId: assignedUserId,
      type: 'project',
      title: 'Project Assignment',
      message: `You have been assigned to project "${project.site_name}" (${project.site_code})`,
      data: {
        projectId: project.id,
        siteCode: project.site_code,
        siteName: project.site_name,
        status: project.status
      }
    });
  } catch (error) {
    console.error('Error notifying user assignment:', error);
  }
};

/**
 * Get notifications for a user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of notifications
 * @param {number} options.offset - Offset for pagination
 * @param {boolean} options.unreadOnly - Only return unread notifications
 * @returns {Promise<Object[]>} User notifications
 */
const getUserNotifications = async (userId, { limit = 50, offset = 0, unreadOnly = false } = {}) => {
  try {
    let sql = `
      SELECT id, user_id, type, title, message, data, is_read, created_at
      FROM notifications
      WHERE user_id = ?
    `;
    const params = [userId];

    if (unreadOnly) {
      sql += ' AND is_read = FALSE';
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const notifications = await query(sql, params);

    return notifications.map(n => ({
      ...n,
      data: safeJsonParse(n.data)
    }));
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Get unread notification count for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Unread count
 */
const getUnreadCount = async (userId) => {
  try {
    const [result] = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return result.count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Mark a notification as read
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID (for verification)
 * @returns {Promise<boolean>} Success status
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of notifications marked as read
 */
const markAllAsRead = async (userId) => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    return result.affectedRows;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID (for verification)
 * @returns {Promise<boolean>} Success status
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const result = await query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Delete all read notifications for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of deleted notifications
 */
const deleteReadNotifications = async (userId) => {
  try {
    const result = await query(
      'DELETE FROM notifications WHERE user_id = ? AND is_read = TRUE',
      [userId]
    );
    return result.affectedRows;
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  createNotificationsForUsers,
  notifyProjectCreated,
  notifyProjectUpdated,
  notifyProjectStatusChanged,
  notifyImportCompleted,
  notifyUserCreated,
  notifyUserAssigned,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications
};
