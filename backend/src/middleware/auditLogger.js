/**
 * Audit Logger Middleware
 * Automatically logs all CRUD operations to the audit_logs table
 * Non-blocking - failures don't affect main operations
 */

const { query } = require('../config/database');

/**
 * Log a CREATE operation to the audit_logs table
 * @param {string} entity - Table/entity name (e.g., 'project_sites')
 * @param {number} recordId - ID of the created record
 * @param {Object} data - The data that was created
 * @param {Object} req - Express request object (for user info and request metadata)
 */
const logCreate = async (entity, recordId, data, req) => {
  try {
    const userId = req.user?.userId || null;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers?.['user-agent'] || null;

    const sql = `
      INSERT INTO audit_logs 
        (user_id, table_name, record_id, action, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, 'CREATE', NULL, ?, ?, ?)
    `;

    await query(sql, [
      userId,
      entity,
      recordId,
      JSON.stringify(data),
      ipAddress,
      userAgent
    ]);

    console.log(`[AUDIT] CREATE logged for ${entity}:${recordId} by user ${userId}`);
  } catch (error) {
    // Non-blocking - log error but don't throw
    console.error('[AUDIT ERROR] Failed to log CREATE operation:', error.message);
  }
};

/**
 * Log an UPDATE operation to the audit_logs table
 * @param {string} entity - Table/entity name (e.g., 'project_sites')
 * @param {number} recordId - ID of the updated record
 * @param {Object} oldData - The data before the update
 * @param {Object} newData - The data after the update
 * @param {Object} req - Express request object (for user info and request metadata)
 */
const logUpdate = async (entity, recordId, oldData, newData, req) => {
  try {
    const userId = req.user?.userId || null;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers?.['user-agent'] || null;

    // Calculate the actual changes
    const changes = {};
    for (const key of Object.keys(newData)) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    }

    // Only log if there are actual changes
    if (Object.keys(changes).length === 0) {
      console.log(`[AUDIT] No changes detected for ${entity}:${recordId}, skipping log`);
      return;
    }

    const sql = `
      INSERT INTO audit_logs 
        (user_id, table_name, record_id, action, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, 'UPDATE', ?, ?, ?, ?)
    `;

    await query(sql, [
      userId,
      entity,
      recordId,
      JSON.stringify(oldData),
      JSON.stringify(newData),
      ipAddress,
      userAgent
    ]);

    console.log(`[AUDIT] UPDATE logged for ${entity}:${recordId} by user ${userId}`);
  } catch (error) {
    // Non-blocking - log error but don't throw
    console.error('[AUDIT ERROR] Failed to log UPDATE operation:', error.message);
  }
};

/**
 * Log a DELETE operation to the audit_logs table
 * @param {string} entity - Table/entity name (e.g., 'project_sites')
 * @param {number} recordId - ID of the deleted record
 * @param {Object} data - The data that was deleted
 * @param {Object} req - Express request object (for user info and request metadata)
 */
const logDelete = async (entity, recordId, data, req) => {
  try {
    const userId = req.user?.userId || null;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers?.['user-agent'] || null;

    const sql = `
      INSERT INTO audit_logs 
        (user_id, table_name, record_id, action, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, 'DELETE', ?, NULL, ?, ?)
    `;

    await query(sql, [
      userId,
      entity,
      recordId,
      JSON.stringify(data),
      ipAddress,
      userAgent
    ]);

    console.log(`[AUDIT] DELETE logged for ${entity}:${recordId} by user ${userId}`);
  } catch (error) {
    // Non-blocking - log error but don't throw
    console.error('[AUDIT ERROR] Failed to log DELETE operation:', error.message);
  }
};

/**
 * Log an IMPORT operation to the audit_logs table
 * @param {string} entity - Table/entity name (e.g., 'project_sites')
 * @param {number} importId - ID of the import record
 * @param {Object} metadata - Import metadata (rows processed, success count, etc.)
 * @param {Object} req - Express request object (for user info and request metadata)
 */
const logImport = async (entity, importId, metadata, req) => {
  try {
    const userId = req.user?.userId || null;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers?.['user-agent'] || null;

    const sql = `
      INSERT INTO audit_logs 
        (user_id, table_name, record_id, action, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, 'IMPORT', NULL, ?, ?, ?)
    `;

    await query(sql, [
      userId,
      entity,
      importId,
      JSON.stringify(metadata),
      ipAddress,
      userAgent
    ]);

    console.log(`[AUDIT] IMPORT logged for ${entity}:${importId} by user ${userId}`);
  } catch (error) {
    // Non-blocking - log error but don't throw
    console.error('[AUDIT ERROR] Failed to log IMPORT operation:', error.message);
  }
};

/**
 * Audit middleware factory
 * Creates middleware that automatically logs CRUD operations
 * 
 * @param {string} entityType - The entity/table name (e.g., 'project_sites')
 * @param {Object} options - Configuration options
 * @param {string[]} options.ignoreFields - Fields to ignore in logging (e.g., ['password'])
 * @returns {Function} Express middleware function
 * 
 * Usage:
 *   router.post('/', auditMiddleware('project_sites'), controller.create);
 *   router.put('/:id', auditMiddleware('project_sites'), controller.update);
 *   router.delete('/:id', auditMiddleware('project_sites'), controller.delete);
 */
const auditMiddleware = (entityType, options = {}) => {
  const { ignoreFields = [] } = options;

  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const recordId = req.params?.id;
    const method = req.method.toUpperCase();

    // Store old data for updates (requires fetching before operation)
    let oldData = null;
    
    if (method === 'PUT' && recordId) {
      try {
        // Fetch existing data for comparison
        const [existing] = await query(`SELECT * FROM ${entityType} WHERE id = ?`, [recordId]);
        if (existing) {
          oldData = { ...existing };
          // Remove sensitive fields
          ignoreFields.forEach(field => delete oldData[field]);
        }
      } catch (error) {
        console.error('[AUDIT] Failed to fetch old data for update:', error.message);
      }
    }

    // Override res.json to capture response
    res.json = function(data) {
      // Restore original method
      res.json = originalJson;

      // Process audit logging asynchronously (non-blocking)
      (async () => {
        try {
          const success = data?.success !== false;
          
          if (!success) {
            console.log(`[AUDIT] Operation failed, skipping audit log for ${entityType}`);
            return;
          }

          switch (method) {
            case 'POST':
              // Creation - new data is in response
              if (data?.data?.id) {
                const newData = { ...data.data };
                ignoreFields.forEach(field => delete newData[field]);
                await logCreate(entityType, data.data.id, newData, req);
              }
              break;

            case 'PUT':
              // Update - compare old and new data
              if (recordId && data?.data) {
                const newData = { ...data.data };
                ignoreFields.forEach(field => delete newData[field]);
                await logUpdate(entityType, parseInt(recordId), oldData, newData, req);
              }
              break;

            case 'DELETE':
              // Deletion - data should be in response
              if (recordId && data?.data) {
                const deletedData = { ...data.data };
                ignoreFields.forEach(field => delete deletedData[field]);
                await logDelete(entityType, parseInt(recordId), deletedData, req);
              }
              break;

            default:
              // No action for other methods
              break;
          }
        } catch (auditError) {
          console.error('[AUDIT ERROR] Middleware audit logging failed:', auditError.message);
        }
      })();

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Manual audit logging helper
 * For use in controllers when automatic middleware isn't suitable
 * 
 * @param {string} action - Action type: 'CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'EXPORT'
 * @param {string} entity - Table/entity name
 * @param {number} recordId - Record ID
 * @param {Object} oldValues - Old values (for UPDATE/DELETE)
 * @param {Object} newValues - New values (for CREATE/UPDATE)
 * @param {Object} req - Express request object
 */
const manualAuditLog = async (action, entity, recordId, oldValues, newValues, req) => {
  try {
    const userId = req.user?.userId || null;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers?.['user-agent'] || null;

    const sql = `
      INSERT INTO audit_logs 
        (user_id, table_name, record_id, action, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      userId,
      entity,
      recordId,
      action,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent
    ]);

    console.log(`[AUDIT] ${action} logged for ${entity}:${recordId} by user ${userId}`);
  } catch (error) {
    console.error('[AUDIT ERROR] Manual audit logging failed:', error.message);
  }
};

module.exports = {
  logCreate,
  logUpdate,
  logDelete,
  logImport,
  auditMiddleware,
  manualAuditLog
};
