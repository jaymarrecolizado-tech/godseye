/**
 * Notification Controller
 * Handles notification-related HTTP requests
 */

const notificationService = require('../services/notificationService');
const { success, STATUS_CODES } = require('../utils/response');

/**
 * Get user's notifications
 * GET /api/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0, unread_only = 'false' } = req.query;

    const notifications = await notificationService.getUserNotifications(userId, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      unreadOnly: unread_only === 'true'
    });

    res.json(success({
      data: notifications,
      message: 'Notifications retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const count = await notificationService.getUnreadCount(userId);

    res.json(success({
      data: { count },
      message: 'Unread count retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a notification as read
 * PUT /api/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const success_marked = await notificationService.markAsRead(parseInt(id, 10), userId);

    if (!success_marked) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Notification not found or already read'
      });
    }

    res.json(success({
      data: { id: parseInt(id, 10) },
      message: 'Notification marked as read'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const count = await notificationService.markAllAsRead(userId);

    res.json(success({
      data: { markedCount: count },
      message: `${count} notification(s) marked as read`
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const success_deleted = await notificationService.deleteNotification(parseInt(id, 10), userId);

    if (!success_deleted) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Notification not found'
      });
    }

    res.json(success({
      data: { id: parseInt(id, 10) },
      message: 'Notification deleted successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete all read notifications
 * DELETE /api/notifications/read-all
 */
const deleteReadNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const count = await notificationService.deleteReadNotifications(userId);

    res.json(success({
      data: { deletedCount: count },
      message: `${count} read notification(s) deleted`
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Create a test notification (for development/testing)
 * POST /api/notifications/test
 * Admin only
 */
const createTestNotification = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { type = 'system', title = 'Test Notification', message = 'This is a test notification' } = req.body;

    const notification = await notificationService.createNotification({
      userId,
      type,
      title,
      message,
      data: { test: true, timestamp: new Date().toISOString() }
    });

    res.status(STATUS_CODES.CREATED).json(success({
      data: notification,
      message: 'Test notification created'
    }));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  createTestNotification
};
