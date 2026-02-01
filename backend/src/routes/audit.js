/**
 * Audit Log Routes
 * Handles audit log API endpoints
 * 
 * SECURITY NOTE: All audit log routes require authentication.
 * Only users with Manager role or higher can access audit logs.
 */

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticateToken, requireMinRole } = require('../middleware/auth');

// Apply authentication to all audit log routes
// Restrict access to Manager role and above (Manager, Admin)
router.use(authenticateToken);
router.use(requireMinRole('Manager'));

/**
 * @route   GET /api/audit-logs
 * @desc    Get audit logs with filtering and pagination
 * @query   page, limit, entity_type, action, user_id, date_from, date_to
 * @access  Private
 */
router.get('/', auditController.getAuditLogs);

/**
 * @route   GET /api/audit-logs/stats
 * @desc    Get audit log statistics
 * @query   date_from, date_to
 * @access  Private
 */
router.get('/stats', auditController.getAuditStats);

/**
 * @route   GET /api/audit-logs/entity-types
 * @desc    Get distinct entity types for filters
 * @access  Private
 */
router.get('/entity-types', auditController.getEntityTypes);

/**
 * @route   GET /api/audit-logs/:id
 * @desc    Get a single audit log by ID
 * @access  Private
 */
router.get('/:id', auditController.getAuditLogById);

module.exports = router;
