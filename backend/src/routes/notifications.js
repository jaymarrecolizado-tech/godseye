/**
 * Notification Routes
 * API endpoints for notification management
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All notification routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications
 * @query   {number} limit - Maximum number of notifications (default: 50)
 * @query   {number} offset - Offset for pagination (default: 0)
 * @query   {boolean} unread_only - Only return unread notifications (default: false)
 * @access  Private
 */
router.get('/', notificationController.getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put('/:id/read', notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', notificationController.deleteNotification);

/**
 * @route   DELETE /api/notifications/read-all
 * @desc    Delete all read notifications
 * @access  Private
 */
router.delete('/read-all', notificationController.deleteReadNotifications);

/**
 * @route   POST /api/notifications/test
 * @desc    Create a test notification (admin only)
 * @access  Private (Admin)
 */
router.post('/test', requireRole(['Admin']), notificationController.createTestNotification);

module.exports = router;
