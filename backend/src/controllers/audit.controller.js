/**
 * Audit Log Controller
 * Business logic for audit log operations
 */

const { query, buildPagination } = require('../config/database');
const { success, paginated, STATUS_CODES } = require('../utils/response');

/**
 * Get audit logs with filtering and pagination
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      entity_type,
      action,
      user_id,
      date_from,
      date_to
    } = req.query;

    const { limit: limitNum, offset } = buildPagination(page, limit);

    // Build WHERE clause
    const conditions = [];
    const params = [];

    if (entity_type) {
      conditions.push('al.entity_type = ?');
      params.push(entity_type);
    }

    if (action) {
      conditions.push('al.action = ?');
      params.push(action);
    }

    if (user_id) {
      conditions.push('al.user_id = ?');
      params.push(user_id);
    }

    if (date_from) {
      conditions.push('al.created_at >= ?');
      params.push(date_from);
    }

    if (date_to) {
      conditions.push('al.created_at <= ?');
      // Add time to include the full end date
      const endDate = new Date(date_to);
      endDate.setHours(23, 59, 59, 999);
      params.push(endDate.toISOString().slice(0, 19).replace('T', ' '));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      ${whereClause}
    `;
    const [countResult] = await query(countSql, params);
    const total = countResult.total;

    // Get audit logs with user details
    const logsSql = `
      SELECT
        al.id,
        al.entity_type,
        al.entity_id,
        al.action,
        al.old_values,
        al.new_values,
        al.user_id,
        al.created_at,
        u.full_name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const logs = await query(logsSql, [...params, limitNum, offset]);

    // Format the response data
    const formattedLogs = logs.map(log => ({
      id: log.id,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      action: log.action,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null,
      user: log.user_id ? {
        id: log.user_id,
        name: log.user_name,
        email: log.user_email
      } : null,
      created_at: log.created_at
    }));

    res.json(paginated(formattedLogs, { page: page || 1, limit: limitNum, total }, 'Audit logs retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get distinct entity types for filter dropdown
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getEntityTypes = async (req, res, next) => {
  try {
    const sql = `
      SELECT DISTINCT entity_type
      FROM audit_logs
      ORDER BY entity_type ASC
    `;

    const results = await query(sql);
    const entityTypes = results.map(r => r.entity_type);

    res.json(success({
      data: entityTypes,
      message: 'Entity types retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit log statistics
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getAuditStats = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;

    // Build WHERE clause for date range
    const conditions = [];
    const params = [];

    if (date_from) {
      conditions.push('created_at >= ?');
      params.push(date_from);
    }

    if (date_to) {
      conditions.push('created_at <= ?');
      const endDate = new Date(date_to);
      endDate.setHours(23, 59, 59, 999);
      params.push(endDate.toISOString().slice(0, 19).replace('T', ' '));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get action counts
    const actionCountsSql = `
      SELECT action, COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY action
    `;

    const actionCounts = await query(actionCountsSql, params);

    // Get entity type counts
    const entityCountsSql = `
      SELECT entity_type, COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY entity_type
      ORDER BY count DESC
    `;

    const entityCounts = await query(entityCountsSql, params);

    // Get total count
    const totalSql = `
      SELECT COUNT(*) as total
      FROM audit_logs
      ${whereClause}
    `;

    const [totalResult] = await query(totalSql, params);

    // Format action counts
    const actionStats = {};
    actionCounts.forEach(item => {
      actionStats[item.action.toLowerCase()] = item.count;
    });

    res.json(success({
      data: {
        total: totalResult.total,
        actions: actionStats,
        by_entity: entityCounts
      },
      message: 'Audit statistics retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single audit log by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT
        al.id,
        al.entity_type,
        al.entity_id,
        al.action,
        al.old_values,
        al.new_values,
        al.user_id,
        al.created_at,
        u.full_name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = ?
    `;

    const [log] = await query(sql, [id]);

    if (!log) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Audit log not found'
      });
    }

    const formattedLog = {
      id: log.id,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      action: log.action,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null,
      user: log.user_id ? {
        id: log.user_id,
        name: log.user_name,
        email: log.user_email
      } : null,
      created_at: log.created_at
    };

    res.json(success({
      data: formattedLog,
      message: 'Audit log retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};
