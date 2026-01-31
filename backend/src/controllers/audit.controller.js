/**
 * Audit Log Controller
 * Business logic for audit log operations
 * Updated to match actual database schema
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
      entity,
      action,
      user,
      date_from,
      date_to
    } = req.query;

    const { limit: limitNum, offset } = buildPagination(page, limit);

    // Build WHERE clause
    const conditions = [];
    const params = [];

    // Filter by table_name (mapped from 'entity' query param)
    if (entity) {
      conditions.push('al.table_name = ?');
      params.push(entity);
    }

    // Filter by action
    if (action) {
      conditions.push('al.action = ?');
      params.push(action);
    }

    // Filter by user_id (mapped from 'user' query param)
    if (user) {
      conditions.push('al.user_id = ?');
      params.push(user);
    }

    // Filter by date range
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

    // Get audit logs with user info
    let logsSql = `
      SELECT
        al.id,
        al.table_name as entity,
        al.record_id as entity_id,
        al.action,
        al.old_values,
        al.new_values,
        al.user_id,
        u.username as user_username,
        u.full_name as user_full_name,
        al.ip_address,
        al.created_at as timestamp
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ${parseInt(limitNum)} OFFSET ${parseInt(offset)}
    `;

    const logs = await query(logsSql, params);

    // Format the response data
    const formattedLogs = logs.map(log => ({
      id: log.id,
      entity: log.entity,
      entity_id: log.entity_id,
      action: log.action,
      changes: {
        old: log.old_values,
        new: log.new_values
      },
      user: log.user_username || log.user_full_name || `User ${log.user_id}`,
      user_id: log.user_id,
      ip_address: log.ip_address,
      timestamp: log.timestamp
    }));

    res.json(paginated(formattedLogs, { page: page || 1, limit: limitNum, total }, 'Audit logs retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get distinct entities (table names) for filter dropdown
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getEntityTypes = async (req, res, next) => {
  try {
    const sql = `
      SELECT DISTINCT table_name as entity
      FROM audit_logs
      ORDER BY table_name ASC
    `;

    const results = await query(sql);
    const entities = results.map(r => r.entity).filter(e => e);

    res.json(success({
      data: entities,
      message: 'Entities retrieved successfully'
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

    // Get entity counts (table_name)
    const entityCountsSql = `
      SELECT table_name as entity, COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY table_name
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
      actionStats[item.action?.toLowerCase() || 'unknown'] = item.count;
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
        al.table_name as entity,
        al.record_id as entity_id,
        al.action,
        al.old_values,
        al.new_values,
        al.user_id,
        u.username as user_username,
        u.full_name as user_full_name,
        al.ip_address,
        al.user_agent,
        al.created_at as timestamp
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
      entity: log.entity,
      entity_id: log.entity_id,
      action: log.action,
      changes: {
        old: log.old_values,
        new: log.new_values
      },
      user: log.user_username || log.user_full_name || `User ${log.user_id}`,
      user_id: log.user_id,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      timestamp: log.timestamp
    };

    res.json(success({
      data: formattedLog,
      message: 'Audit log retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new audit log entry
 * Helper function for other controllers to use
 * @param {Object} data - Audit log data
 * @param {number} data.user_id - User ID who performed the action
 * @param {string} data.table_name - Table name being modified
 * @param {number} data.record_id - Record ID being modified
 * @param {string} data.action - Action type (CREATE, UPDATE, DELETE, IMPORT, EXPORT)
 * @param {Object} data.old_values - Old values (for UPDATE/DELETE)
 * @param {Object} data.new_values - New values (for CREATE/UPDATE)
 * @param {string} data.ip_address - IP address of the user
 * @param {string} data.user_agent - User agent string
 */
exports.createAuditLog = async (data) => {
  try {
    const {
      user_id,
      table_name,
      record_id,
      action,
      old_values = null,
      new_values = null,
      ip_address = null,
      user_agent = null
    } = data;

    const sql = `
      INSERT INTO audit_logs 
        (user_id, table_name, record_id, action, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      user_id,
      table_name,
      record_id,
      action,
      old_values ? JSON.stringify(old_values) : null,
      new_values ? JSON.stringify(new_values) : null,
      ip_address,
      user_agent
    ]);

    return result.insertId;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit log failure shouldn't break the main operation
    return null;
  }
};
