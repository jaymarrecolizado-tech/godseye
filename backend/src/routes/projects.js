/**
 * Projects Routes
 * CRUD operations for project sites
 */

const express = require('express');
const router = express.Router();
const { query, transaction, buildPagination } = require('../config/database');
const { success, paginated, sendError, STATUS_CODES } = require('../utils/response');
const { projectValidation } = require('../middleware/validation');

// ============================================
// LIST PROJECTS
// ============================================
router.get('/', projectValidation.list, async (req, res, next) => {
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
});

// ============================================
// GET SINGLE PROJECT
// ============================================
router.get('/:id', projectValidation.getById, async (req, res, next) => {
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
});

// ============================================
// CREATE PROJECT
// ============================================
router.post('/', projectValidation.create, async (req, res, next) => {
  try {
    const {
      site_code,
      project_type_id,
      site_name,
      barangay_id,
      municipality_id,
      province_id,
      district_id,
      latitude,
      longitude,
      activation_date,
      status = 'Pending',
      remarks
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
    
    // Insert project with spatial point
    const insertSql = `
      INSERT INTO project_sites (
        site_code, project_type_id, site_name, 
        barangay_id, municipality_id, province_id, district_id,
        latitude, longitude, location,
        activation_date, status, remarks,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ST_GeomFromText(?, 4326), ?, ?, ?, ?, ?)
    `;
    
    const pointWKT = `POINT(${longitude} ${latitude})`;
    const userId = req.user?.id || null; // Assuming auth middleware sets req.user
    
    const result = await query(insertSql, [
      site_code,
      project_type_id,
      site_name,
      barangay_id || null,
      municipality_id,
      province_id,
      district_id || null,
      latitude,
      longitude,
      pointWKT,
      activation_date || null,
      status,
      remarks || null,
      userId,
      userId
    ]);
    
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
    
    res.status(STATUS_CODES.CREATED).json(success({
      data: newProject,
      message: 'Project created successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// UPDATE PROJECT
// ============================================
router.put('/:id', projectValidation.update, async (req, res, next) => {
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
      'barangay_id', 'municipality_id', 'province_id', 'district_id',
      'latitude', 'longitude', 'activation_date', 'status', 'remarks'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }
    
    // Update spatial point if lat/lng changed
    if (updates.latitude !== undefined || updates.longitude !== undefined) {
      const lat = updates.latitude !== undefined ? updates.latitude : existing.latitude;
      const lng = updates.longitude !== undefined ? updates.longitude : existing.longitude;
      updateFields.push('location = ST_GeomFromText(?, 4326)');
      params.push(`POINT(${lng} ${lat})`);
    }
    
    // Add updated_by
    const userId = req.user?.id || null;
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
    
    res.json(success({
      data: updatedProject,
      message: 'Project updated successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// DELETE PROJECT
// ============================================
router.delete('/:id', projectValidation.delete, async (req, res, next) => {
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
});

// ============================================
// GET PROJECT STATUS HISTORY
// ============================================
router.get('/:id/history', projectValidation.getHistory, async (req, res, next) => {
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
});

module.exports = router;
