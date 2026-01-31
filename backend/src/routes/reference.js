/**
 * Reference Data Routes
 * Lookup data for dropdowns and filters
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { success, sendError, STATUS_CODES } = require('../utils/response');
const { referenceValidation } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes in this router
router.use(authenticateToken);

// ============================================
// GET ALL PROVINCES
// ============================================
router.get('/provinces', async (req, res, next) => {
  try {
    const { region_code, include_stats } = req.query;
    
    let sql;
    let params = [];
    
    if (include_stats === 'true') {
      // Include project count for each province
      sql = `
        SELECT 
          p.id,
          p.name,
          p.region_code,
          COUNT(ps.id) as project_count,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending_count
        FROM provinces p
        LEFT JOIN project_sites ps ON p.id = ps.province_id
        ${region_code ? 'WHERE p.region_code = ?' : ''}
        GROUP BY p.id, p.name, p.region_code
        ORDER BY p.name
      `;
      if (region_code) params.push(region_code);
    } else {
      // Simple province list
      sql = `
        SELECT 
          id,
          name,
          region_code
        FROM provinces
        ${region_code ? 'WHERE region_code = ?' : ''}
        ORDER BY name
      `;
      if (region_code) params.push(region_code);
    }
    
    const provinces = await query(sql, params);
    
    res.json(success({
      data: provinces,
      message: 'Provinces retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET SINGLE PROVINCE WITH DETAILS
// ============================================
router.get('/provinces/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.region_code,
        COUNT(ps.id) as project_count,
        COUNT(DISTINCT m.id) as municipality_count
      FROM provinces p
      LEFT JOIN project_sites ps ON p.id = ps.province_id
      LEFT JOIN municipalities m ON p.id = m.province_id
      WHERE p.id = ?
      GROUP BY p.id, p.name, p.region_code
    `;
    
    const [province] = await query(sql, [id]);
    
    if (!province) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Province not found'
      });
    }
    
    res.json(success({
      data: province,
      message: 'Province retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET MUNICIPALITIES
// ============================================
router.get('/municipalities', referenceValidation.municipalities, async (req, res, next) => {
  try {
    const { province_id, district_id, include_stats } = req.query;
    
    let sql;
    let params = [province_id];
    
    if (include_stats === 'true') {
      sql = `
        SELECT 
          m.id,
          m.name,
          m.municipality_code,
          m.district_id,
          d.name as district_name,
          COUNT(ps.id) as project_count,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending_count
        FROM municipalities m
        LEFT JOIN districts d ON m.district_id = d.id
        LEFT JOIN project_sites ps ON m.id = ps.municipality_id
        WHERE m.province_id = ?
        ${district_id ? 'AND m.district_id = ?' : ''}
        GROUP BY m.id, m.name, m.municipality_code, m.district_id, d.name
        ORDER BY m.name
      `;
      if (district_id) params.push(district_id);
    } else {
      sql = `
        SELECT 
          m.id,
          m.name,
          m.municipality_code,
          m.district_id,
          d.name as district_name
        FROM municipalities m
        LEFT JOIN districts d ON m.district_id = d.id
        WHERE m.province_id = ?
        ${district_id ? 'AND m.district_id = ?' : ''}
        ORDER BY m.name
      `;
      if (district_id) params.push(district_id);
    }
    
    const municipalities = await query(sql, params);
    
    res.json(success({
      data: municipalities,
      message: 'Municipalities retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET BARANGAYS
// ============================================
router.get('/barangays', referenceValidation.barangays, async (req, res, next) => {
  try {
    const { municipality_id, include_stats } = req.query;
    
    let sql;
    let params = [municipality_id];
    
    if (include_stats === 'true') {
      sql = `
        SELECT 
          b.id,
          b.name,
          b.barangay_code,
          COUNT(ps.id) as project_count,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending_count
        FROM barangays b
        LEFT JOIN project_sites ps ON b.id = ps.barangay_id
        WHERE b.municipality_id = ?
        GROUP BY b.id, b.name, b.barangay_code
        ORDER BY b.name
      `;
    } else {
      sql = `
        SELECT 
          id,
          name,
          barangay_code
        FROM barangays
        WHERE municipality_id = ?
        ORDER BY name
      `;
    }
    
    const barangays = await query(sql, params);
    
    res.json(success({
      data: barangays,
      message: 'Barangays retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET DISTRICTS
// ============================================
router.get('/districts', async (req, res, next) => {
  try {
    const { province_id } = req.query;
    
    let sql;
    let params = [];
    
    sql = `
      SELECT 
        d.id,
        d.name,
        d.district_code,
        d.province_id,
        p.name as province_name
      FROM districts d
      JOIN provinces p ON d.province_id = p.id
      ${province_id ? 'WHERE d.province_id = ?' : ''}
      ORDER BY p.name, d.name
    `;
    
    if (province_id) params.push(province_id);
    
    const districts = await query(sql, params);
    
    res.json(success({
      data: districts,
      message: 'Districts retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET PROJECT TYPES
// ============================================
router.get('/project-types', async (req, res, next) => {
  try {
    const { include_stats, include_inactive } = req.query;
    
    let sql;
    let params = [];
    
    if (include_stats === 'true') {
      sql = `
        SELECT 
          pt.id,
          pt.name,
          pt.code_prefix,
          pt.color_code,
          pt.is_active,
          COUNT(ps.id) as project_count,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN ps.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_count
        FROM project_types pt
        LEFT JOIN project_sites ps ON pt.id = ps.project_type_id
        ${include_inactive !== 'true' ? 'WHERE pt.is_active = TRUE' : ''}
        GROUP BY pt.id, pt.name, pt.code_prefix, pt.color_code, pt.is_active
        ORDER BY pt.name
      `;
    } else {
      sql = `
        SELECT 
          id,
          name,
          code_prefix,
          color_code,
          is_active
        FROM project_types
        ${include_inactive !== 'true' ? 'WHERE is_active = TRUE' : ''}
        ORDER BY name
      `;
    }
    
    const projectTypes = await query(sql, params);
    
    res.json(success({
      data: projectTypes,
      message: 'Project types retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET SINGLE PROJECT TYPE
// ============================================
router.get('/project-types/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const sql = `
      SELECT 
        pt.id,
        pt.name,
        pt.code_prefix,
        pt.color_code,
        pt.is_active,
        COUNT(ps.id) as project_count
      FROM project_types pt
      LEFT JOIN project_sites ps ON pt.id = ps.project_type_id
      WHERE pt.id = ?
      GROUP BY pt.id, pt.name, pt.code_prefix, pt.color_code, pt.is_active
    `;
    
    const [projectType] = await query(sql, [id]);
    
    if (!projectType) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Project type not found'
      });
    }
    
    res.json(success({
      data: projectType,
      message: 'Project type retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET LOCATION HIERARCHY (Full tree)
// ============================================
router.get('/location-hierarchy', async (req, res, next) => {
  try {
    const { province_id } = req.query;
    
    // Get provinces with their municipalities and barangays
    const sql = `
      SELECT 
        p.id as province_id,
        p.name as province_name,
        p.region_code,
        m.id as municipality_id,
        m.name as municipality_name,
        b.id as barangay_id,
        b.name as barangay_name
      FROM provinces p
      LEFT JOIN municipalities m ON p.id = m.province_id
      LEFT JOIN barangays b ON m.id = b.municipality_id
      ${province_id ? 'WHERE p.id = ?' : ''}
      ORDER BY p.name, m.name, b.name
    `;
    
    const rows = await query(sql, province_id ? [province_id] : []);
    
    // Build hierarchical structure
    const hierarchy = {};
    
    for (const row of rows) {
      // Add province
      if (!hierarchy[row.province_id]) {
        hierarchy[row.province_id] = {
          id: row.province_id,
          name: row.province_name,
          region_code: row.region_code,
          municipalities: {}
        };
      }
      
      // Add municipality
      if (row.municipality_id && !hierarchy[row.province_id].municipalities[row.municipality_id]) {
        hierarchy[row.province_id].municipalities[row.municipality_id] = {
          id: row.municipality_id,
          name: row.municipality_name,
          barangays: []
        };
      }
      
      // Add barangay
      if (row.barangay_id && row.municipality_id) {
        hierarchy[row.province_id].municipalities[row.municipality_id].barangays.push({
          id: row.barangay_id,
          name: row.barangay_name
        });
      }
    }
    
    // Convert to array format
    const result = Object.values(hierarchy).map(province => ({
      ...province,
      municipalities: Object.values(province.municipalities)
    }));
    
    res.json(success({
      data: result,
      message: 'Location hierarchy retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
});

// ============================================
// SEARCH LOCATIONS
// ============================================
router.get('/search-locations', async (req, res, next) => {
  try {
    const { q, type = 'all' } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Bad Request',
        message: 'Search query must be at least 2 characters'
      });
    }
    
    const searchPattern = `%${q}%`;
    const results = {
      provinces: [],
      municipalities: [],
      barangays: []
    };
    
    // Search provinces
    if (type === 'all' || type === 'province') {
      results.provinces = await query(`
        SELECT id, name, region_code, 'province' as type
        FROM provinces
        WHERE name LIKE ?
        ORDER BY name
        LIMIT 10
      `, [searchPattern]);
    }
    
    // Search municipalities
    if (type === 'all' || type === 'municipality') {
      results.municipalities = await query(`
        SELECT m.id, m.name, p.name as province, 'municipality' as type
        FROM municipalities m
        JOIN provinces p ON m.province_id = p.id
        WHERE m.name LIKE ?
        ORDER BY m.name
        LIMIT 10
      `, [searchPattern]);
    }
    
    // Search barangays
    if (type === 'all' || type === 'barangay') {
      results.barangays = await query(`
        SELECT b.id, b.name, m.name as municipality, p.name as province, 'barangay' as type
        FROM barangays b
        JOIN municipalities m ON b.municipality_id = m.id
        JOIN provinces p ON m.province_id = p.id
        WHERE b.name LIKE ?
        ORDER BY b.name
        LIMIT 10
      `, [searchPattern]);
    }
    
    const flatResults = [
      ...results.provinces,
      ...results.municipalities,
      ...results.barangays
    ];
    
    res.json(success({
      data: flatResults,
      message: `Found ${flatResults.length} locations matching "${q}"`
    }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
