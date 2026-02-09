/**
 * Project Controller
 * Business logic for project management operations
 */

const { query, buildPagination } = require('../config/database');
const { success, paginated, STATUS_CODES } = require('../utils/response');
const notificationService = require('../services/notificationService');

/**
 * List projects with filtering and pagination
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.listProjects = async (req, res, next) => {
  try {
    const { 
      page, 
      limit, 
      status, 
      project_type_id, 
      province_id, 
      municipality_id, 
      barangay_id,
      date_from,
      date_to,
      search
    } = req.query;
    
    const { limit: limitNum, offset } = buildPagination(page, limit);
    
    // Build WHERE clause
    const conditions = [];
    const params = [];
    
    if (status) {
      conditions.push('ps.status = ?');
      params.push(status);
    }
    
    if (project_type_id) {
      conditions.push('ps.project_type_id = ?');
      params.push(project_type_id);
    }
    
    if (province_id) {
      conditions.push('ps.province_id = ?');
      params.push(province_id);
    }
    
    if (municipality_id) {
      conditions.push('ps.municipality_id = ?');
      params.push(municipality_id);
    }
    
    if (barangay_id) {
      conditions.push('ps.barangay_id = ?');
      params.push(barangay_id);
    }
    
    if (date_from) {
      conditions.push('ps.activation_date >= ?');
      params.push(date_from);
    }
    
    if (date_to) {
      conditions.push('ps.activation_date <= ?');
      params.push(date_to);
    }
    
    if (search) {
      conditions.push('(ps.site_code LIKE ? OR ps.site_name LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countSql = `
      SELECT COUNT(*) as total 
      FROM project_sites ps
      ${whereClause}
    `;
    const [countResult] = await query(countSql, params);
    const total = countResult.total;
    
    // Get projects with location details
    const projectsSql = `
      SELECT 
        ps.id,
        ps.site_code,
        ps.site_name,
        ps.project_type_id,
        pt.name as project_type,
        pt.code_prefix,
        pt.color_code,
        ps.status,
        ps.activation_date,
        ps.latitude,
        ps.longitude,
        ps.remarks,
        ps.created_at,
        ps.updated_at,
        p.id as province_id,
        p.name as province,
        m.id as municipality_id,
        m.name as municipality,
        b.id as barangay_id,
        b.name as barangay,
        d.id as district_id,
        d.name as district
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      JOIN provinces p ON ps.province_id = p.id
      JOIN municipalities m ON ps.municipality_id = m.id
      LEFT JOIN barangays b ON ps.barangay_id = b.id
      LEFT JOIN districts d ON ps.district_id = d.id
      ${whereClause}
      ORDER BY ps.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const projects = await query(projectsSql, [...params, limitNum, offset]);
    
    res.json(paginated(projects, { page: page || 1, limit: limitNum, total }, 'Projects retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single project by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const sql = `
      SELECT 
        ps.id,
        ps.site_code,
        ps.site_name,
        ps.project_type_id,
        pt.name as project_type,
        pt.code_prefix,
        pt.color_code,
        ps.status,
        ps.activation_date,
        ps.latitude,
        ps.longitude,
        ps.remarks,
        ps.metadata,
        ps.created_at,
        ps.updated_at,
        p.id as province_id,
        p.name as province,
        m.id as municipality_id,
        m.name as municipality,
        b.id as barangay_id,
        b.name as barangay,
        d.id as district_id,
        d.name as district,
        u1.full_name as created_by_name,
        u2.full_name as updated_by_name
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      JOIN provinces p ON ps.province_id = p.id
      JOIN municipalities m ON ps.municipality_id = m.id
      LEFT JOIN barangays b ON ps.barangay_id = b.id
      LEFT JOIN districts d ON ps.district_id = d.id
      LEFT JOIN users u1 ON ps.created_by = u1.id
      LEFT JOIN users u2 ON ps.updated_by = u2.id
      WHERE ps.id = ?
    `;
    
    const [project] = await query(sql, [id]);
    
    if (!project) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Project not found'
      });
    }
    
    res.json(success({ data: project, message: 'Project retrieved successfully' }));
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new project
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.createProject = async (req, res, next) => {
  try {
    const {
      site_code,
      project_type_id,
      site_name,
      implementing_agency,
      budget,
      description,
      expected_output,
      barangay_id,
      municipality_id,
      province_id,
      district_id,
      latitude,
      longitude,
      activation_date,
      start_date,
      end_date,
      status = 'Pending',
      remarks,
      accomplishments
    } = req.body;
    
    // Check for duplicate site_code
    const [existing] = await query('SELECT id FROM project_sites WHERE site_code = ?', [site_code]);
    if (existing) {
      return res.status(STATUS_CODES.CONFLICT).json({
        success: false,
        error: 'Conflict',
        message: 'A project with this site code already exists'
      });
    }
    
    // Insert project
    const insertSql = `
      INSERT INTO project_sites (
        site_code, project_type_id, site_name,
        implementing_agency, budget, description, expected_output,
        barangay_id, municipality_id, province_id, district_id,
        latitude, longitude,
        activation_date, start_date, end_date, status, remarks,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const userId = req.user.userId;
    
    const result = await query(insertSql, [
      site_code,
      project_type_id,
      site_name,
      implementing_agency || null,
      budget || null,
      description || null,
      expected_output || null,
      barangay_id || null,
      municipality_id,
      province_id,
      district_id || null,
      latitude,
      longitude,
      activation_date || null,
      start_date || null,
      end_date || null,
      status,
      remarks || null,
      userId,
      userId
    ]);
    
    const projectId = result.insertId;
    
    // Insert accomplishments if provided
    if (accomplishments && Array.isArray(accomplishments) && accomplishments.length > 0) {
      const accomplishmentSql = `
        INSERT INTO accomplishments
        (project_site_id, accomplishment_date, description, percentage_complete, actual_output, remarks, created_by)
        VALUES ?
      `;
      
      const accomplishmentValues = accomplishments.map(acc => [
        projectId,
        acc.accomplishment_date || new Date(),
        acc.description,
        acc.percentage_complete || 0,
        acc.actual_output || null,
        acc.remarks || null,
        userId
      ]);
      
      await query(accomplishmentSql, [accomplishmentValues]);
    }
    
    // Get the created project
    const [newProject] = await query(`
      SELECT 
        ps.*, 
        pt.name as project_type,
        pt.color_code,
        p.name as province,
        m.name as municipality,
        b.name as barangay
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      JOIN provinces p ON ps.province_id = p.id
      JOIN municipalities m ON ps.municipality_id = m.id
      LEFT JOIN barangays b ON ps.barangay_id = b.id
      WHERE ps.id = ?
    `, [result.insertId]);
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to('projects').emit('project:created', newProject);
    }

    // Send notifications to admins and managers
    notificationService.notifyProjectCreated(newProject, userId).catch(error => {
      console.error('Error sending project creation notification:', error);
    });
    
    res.status(STATUS_CODES.CREATED).json(success({
      data: newProject,
      message: 'Project created successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing project
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if project exists
    const [existing] = await query('SELECT * FROM project_sites WHERE id = ?', [id]);
    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Project not found'
      });
    }
    
    // Check for duplicate site_code if updating site_code
    if (updates.site_code && updates.site_code !== existing.site_code) {
      const [duplicate] = await query('SELECT id FROM project_sites WHERE site_code = ? AND id != ?', [updates.site_code, id]);
      if (duplicate) {
        return res.status(STATUS_CODES.CONFLICT).json({
          success: false,
          error: 'Conflict',
          message: 'A project with this site code already exists'
        });
      }
    }
    
    // Build dynamic update query
    const updateFields = [];
    const params = [];
    
    const allowedFields = [
      'site_code', 'project_type_id', 'site_name',
      'implementing_agency', 'budget', 'description', 'expected_output',
      'barangay_id', 'municipality_id', 'province_id', 'district_id',
      'latitude', 'longitude', 'activation_date', 'start_date', 'end_date', 'status', 'remarks'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }
    
    // Note: latitude/longitude are already handled above in the allowedFields loop
    
    // Add updated_by
    const userId = req.user.userId;
    updateFields.push('updated_by = ?');
    params.push(userId);
    
    if (updateFields.length === 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Bad Request',
        message: 'No valid fields to update'
      });
    }
    
    params.push(id);
    
    const updateSql = `UPDATE project_sites SET ${updateFields.join(', ')} WHERE id = ?`;
    await query(updateSql, params);
    
    // Get updated project
    const [updatedProject] = await query(`
      SELECT 
        ps.*, 
        pt.name as project_type,
        pt.color_code,
        p.name as province,
        m.name as municipality,
        b.name as barangay,
        d.name as district
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      JOIN provinces p ON ps.province_id = p.id
      JOIN municipalities m ON ps.municipality_id = m.id
      LEFT JOIN barangays b ON ps.barangay_id = b.id
      LEFT JOIN districts d ON ps.district_id = d.id
      WHERE ps.id = ?
    `, [id]);
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to('projects').emit('project:updated', updatedProject);
    }

    // Send notifications based on what changed
    if (updates.status && updates.status !== existing.status) {
      // Status changed - send status change notification
      notificationService.notifyProjectStatusChanged(
        updatedProject,
        existing.status,
        updates.status,
        userId
      ).catch(error => {
        console.error('Error sending status change notification:', error);
      });
    } else {
      // General update notification
      const changes = {};
      for (const key of Object.keys(updates)) {
        if (updates[key] !== undefined && updates[key] !== existing[key]) {
          changes[key] = updates[key];
        }
      }
      if (Object.keys(changes).length > 0) {
        notificationService.notifyProjectUpdated(updatedProject, changes, userId).catch(error => {
          console.error('Error sending project update notification:', error);
        });
      }
    }
    
    res.json(success({
      data: updatedProject,
      message: 'Project updated successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a project
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if project exists
    const [existing] = await query('SELECT site_code, site_name FROM project_sites WHERE id = ?', [id]);
    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Project not found'
      });
    }
    
    // Delete project (audit trigger will log this)
    await query('DELETE FROM project_sites WHERE id = ?', [id]);
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to('projects').emit('project:deleted', { id, site_code: existing.site_code });
    }
    
    res.json(success({
      data: { id, site_code: existing.site_code, site_name: existing.site_name },
      message: 'Project deleted successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get project status history
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getProjectHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if project exists
    const [existing] = await query('SELECT id FROM project_sites WHERE id = ?', [id]);
    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Project not found'
      });
    }
    
    const historySql = `
      SELECT 
        psh.id,
        psh.old_status,
        psh.new_status,
        psh.reason,
        psh.changed_at,
        u.full_name as changed_by_name
      FROM project_status_history psh
      LEFT JOIN users u ON psh.changed_by = u.id
      WHERE psh.project_site_id = ?
      ORDER BY psh.changed_at DESC
    `;
    
    const history = await query(historySql, [id]);
    
    res.json(success({
      data: history,
      message: 'Status history retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get project accomplishments
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getProjectAccomplishments = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if project exists
    const [existing] = await query('SELECT id FROM project_sites WHERE id = ?', [id]);
    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Project not found'
      });
    }
    
    const accomplishmentsSql = `
      SELECT
        a.id,
        a.accomplishment_date,
        a.description,
        a.percentage_complete,
        a.actual_output,
        a.remarks,
        a.created_at,
        u.full_name as created_by_name
      FROM accomplishments a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.project_site_id = ?
      ORDER BY a.accomplishment_date DESC
    `;
    
    const accomplishments = await query(accomplishmentsSql, [id]);
    
    res.json(success({
      data: accomplishments,
      message: 'Accomplishments retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Add accomplishment to a project
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.addAccomplishment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      accomplishment_date,
      description,
      percentage_complete,
      actual_output,
      remarks
    } = req.body;
    
    // Check if project exists
    const [existing] = await query('SELECT id FROM project_sites WHERE id = ?', [id]);
    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Project not found'
      });
    }
    
    // Validate required fields
    if (!description || description.trim() === '') {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Bad Request',
        message: 'Accomplishment description is required'
      });
    }
    
    const userId = req.user.userId;
    
    const insertSql = `
      INSERT INTO accomplishments
      (project_site_id, accomplishment_date, description, percentage_complete, actual_output, remarks, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(insertSql, [
      id,
      accomplishment_date || new Date(),
      description,
      percentage_complete || 0,
      actual_output || null,
      remarks || null,
      userId
    ]);
    
    // Get the created accomplishment
    const [newAccomplishment] = await query(`
      SELECT
        a.*,
        u.full_name as created_by_name
      FROM accomplishments a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `, [result.insertId]);
    
    res.status(STATUS_CODES.CREATED).json(success({
      data: newAccomplishment,
      message: 'Accomplishment added successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Update an accomplishment
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.updateAccomplishment = async (req, res, next) => {
  try {
    const { id, accomplishmentId } = req.params;
    const updates = req.body;
    
    // Check if accomplishment exists and belongs to the project
    const [existing] = await query(
      'SELECT * FROM accomplishments WHERE id = ? AND project_site_id = ?',
      [accomplishmentId, id]
    );
    
    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Accomplishment not found'
      });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const params = [];
    
    const allowedFields = [
      'accomplishment_date', 'description', 'percentage_complete', 'actual_output', 'remarks'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Bad Request',
        message: 'No valid fields to update'
      });
    }
    
    params.push(accomplishmentId);
    
    const updateSql = `UPDATE accomplishments SET ${updateFields.join(', ')} WHERE id = ?`;
    await query(updateSql, params);
    
    // Get updated accomplishment
    const [updatedAccomplishment] = await query(`
      SELECT
        a.*,
        u.full_name as created_by_name
      FROM accomplishments a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `, [accomplishmentId]);
    
    res.json(success({
      data: updatedAccomplishment,
      message: 'Accomplishment updated successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an accomplishment
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.deleteAccomplishment = async (req, res, next) => {
  try {
    const { id, accomplishmentId } = req.params;
    
    // Check if accomplishment exists and belongs to the project
    const [existing] = await query(
      'SELECT id FROM accomplishments WHERE id = ? AND project_site_id = ?',
      [accomplishmentId, id]
    );
    
    if (!existing) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Accomplishment not found'
      });
    }
    
    await query('DELETE FROM accomplishments WHERE id = ?', [accomplishmentId]);
    
    res.json(success({
      data: { id: accomplishmentId },
      message: 'Accomplishment deleted successfully'
    }));
  } catch (error) {
    next(error);
  }
};
