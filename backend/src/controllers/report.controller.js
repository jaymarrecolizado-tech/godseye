/**
 * Report Controller
 * Business logic for reports and analytics
 */

const { query } = require('../config/database');
const { success, STATUS_CODES } = require('../utils/response');
const pdfGenerator = require('../services/pdfGenerator');

/**
 * Get dashboard summary statistics
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getSummary = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    
    // Build date filter
    let dateFilter = '';
    const dateParams = [];
    
    if (date_from) {
      dateFilter += ' AND ps.activation_date >= ?';
      dateParams.push(date_from);
    }
    if (date_to) {
      dateFilter += ' AND ps.activation_date <= ?';
      dateParams.push(date_to);
    }
    
    // Get overall statistics
    const summarySql = `
      SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN ps.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN ps.status = 'On Hold' THEN 1 ELSE 0 END) as on_hold,
        COUNT(DISTINCT ps.province_id) as provinces_with_projects,
        COUNT(DISTINCT ps.municipality_id) as municipalities_with_projects,
        COUNT(DISTINCT ps.project_type_id) as active_project_types,
        MIN(ps.created_at) as first_project_date,
        MAX(ps.created_at) as latest_project_date
      FROM project_sites ps
      WHERE 1=1 ${dateFilter}
    `;
    
    const [summary] = await query(summarySql, dateParams);
    
    // Get monthly trends (last 12 months)
    const trendsSql = `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as completed
      FROM project_sites
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
    `;
    
    const trends = await query(trendsSql);
    
    // Get recent activity
    const recentSql = `
      SELECT 
        ps.site_code,
        ps.site_name,
        ps.status,
        pt.name as project_type,
        pt.color_code,
        p.name as province,
        ps.created_at,
        ps.updated_at
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      JOIN provinces p ON ps.province_id = p.id
      ORDER BY ps.updated_at DESC
      LIMIT 10
    `;
    
    const recentActivity = await query(recentSql);
    
    res.json(success({
      data: {
        summary: {
          ...summary,
          completion_rate: summary.total_projects > 0 
            ? Math.round((summary.done / summary.total_projects) * 100) 
            : 0
        },
        trends,
        recent_activity: recentActivity
      },
      message: 'Dashboard summary retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get status breakdown report
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getByStatus = async (req, res, next) => {
  try {
    const { date_from, date_to, group_by = 'project_type' } = req.query;
    
    // Build date filter
    let dateFilter = '';
    const dateParams = [];
    
    if (date_from) {
      dateFilter += ' AND ps.activation_date >= ?';
      dateParams.push(date_from);
    }
    if (date_to) {
      dateFilter += ' AND ps.activation_date <= ?';
      dateParams.push(date_to);
    }
    
    let sql;
    
    if (group_by === 'project_type') {
      // Status breakdown by project type
      sql = `
        SELECT 
          pt.id as project_type_id,
          pt.name as project_type,
          pt.color_code,
          COUNT(*) as total,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN ps.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN ps.status = 'On Hold' THEN 1 ELSE 0 END) as on_hold,
          ROUND(SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_percentage
        FROM project_sites ps
        JOIN project_types pt ON ps.project_type_id = pt.id
        WHERE 1=1 ${dateFilter}
        GROUP BY pt.id, pt.name, pt.color_code
        ORDER BY total DESC
      `;
    } else if (group_by === 'province') {
      // Status breakdown by province
      sql = `
        SELECT 
          p.id as province_id,
          p.name as province,
          COUNT(*) as total,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN ps.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN ps.status = 'On Hold' THEN 1 ELSE 0 END) as on_hold,
          ROUND(SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_percentage
        FROM project_sites ps
        JOIN provinces p ON ps.province_id = p.id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.id, p.name
        ORDER BY total DESC
      `;
    } else {
      // Overall status breakdown
      sql = `
        SELECT 
          status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM project_sites WHERE 1=1 ${dateFilter}), 2) as percentage
        FROM project_sites ps
        WHERE 1=1 ${dateFilter}
        GROUP BY status
        ORDER BY count DESC
      `;
    }
    
    const data = await query(sql, [...dateParams, ...dateParams]);
    
    // Calculate totals for percentage
    const total = data.reduce((sum, row) => sum + row.total, 0) || 
                  data.reduce((sum, row) => sum + row.count, 0);
    
    res.json(success({
      data: {
        breakdown: data,
        total,
        group_by
      },
      message: 'Status breakdown report retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get location breakdown report
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getByLocation = async (req, res, next) => {
  try {
    const { date_from, date_to, level = 'province' } = req.query;
    
    // Build date filter
    let dateFilter = '';
    const dateParams = [];
    
    if (date_from) {
      dateFilter += ' AND ps.activation_date >= ?';
      dateParams.push(date_from);
    }
    if (date_to) {
      dateFilter += ' AND ps.activation_date <= ?';
      dateParams.push(date_to);
    }
    
    let sql;
    
    if (level === 'municipality') {
      // Get municipalities with most projects
      sql = `
        SELECT 
          p.name as province,
          m.name as municipality,
          COUNT(*) as total_projects,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
          COUNT(DISTINCT ps.project_type_id) as project_types
        FROM project_sites ps
        JOIN provinces p ON ps.province_id = p.id
        JOIN municipalities m ON ps.municipality_id = m.id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.name, m.name
        ORDER BY total_projects DESC
      `;
    } else {
      // Province level (default)
      sql = `
        SELECT 
          p.id as province_id,
          p.name as province,
          p.region_code,
          COUNT(*) as total_projects,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN ps.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
          COUNT(DISTINCT ps.municipality_id) as municipalities_count,
          COUNT(DISTINCT ps.project_type_id) as project_types
        FROM project_sites ps
        JOIN provinces p ON ps.province_id = p.id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.id, p.name, p.region_code
        ORDER BY total_projects DESC
      `;
    }
    
    const data = await query(sql, dateParams);
    
    // Get summary statistics
    const summarySql = `
      SELECT 
        COUNT(DISTINCT ps.province_id) as provinces_with_projects,
        COUNT(DISTINCT ps.municipality_id) as municipalities_with_projects,
        COUNT(DISTINCT ps.barangay_id) as barangays_with_projects
      FROM project_sites ps
      WHERE 1=1 ${dateFilter}
    `;
    
    const [summary] = await query(summarySql, dateParams);
    
    res.json(success({
      data: {
        locations: data,
        summary
      },
      message: 'Location breakdown report retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get timeline report (time-series data)
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getTimeline = async (req, res, next) => {
  try {
    const { date_from, date_to, group_by = 'month' } = req.query;
    
    // Build date filter
    let dateFilter = '';
    const dateParams = [];
    
    if (date_from) {
      dateFilter += ' AND ps.activation_date >= ?';
      dateParams.push(date_from);
    }
    if (date_to) {
      dateFilter += ' AND ps.activation_date <= ?';
      dateParams.push(date_to);
    }
    
    let dateFormat;
    switch (group_by) {
      case 'year':
        dateFormat = '%Y';
        break;
      case 'quarter':
        dateFormat = '%Y-Q%q';
        break;
      case 'week':
        dateFormat = '%Y-W%u';
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m';
    }
    
    const sql = `
      SELECT 
        DATE_FORMAT(ps.activation_date, ?) as period,
        COUNT(*) as total_created,
        SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending
      FROM project_sites ps
      WHERE ps.activation_date IS NOT NULL ${dateFilter}
      GROUP BY DATE_FORMAT(ps.activation_date, ?)
      ORDER BY period
    `;
    
    const data = await query(sql, [dateFormat, ...dateParams, dateFormat]);
    
    res.json(success({
      data: {
        timeline: data,
        group_by
      },
      message: 'Timeline report retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get project type analysis
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getByProjectType = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    
    // Build date filter
    let dateFilter = '';
    const dateParams = [];
    
    if (date_from) {
      dateFilter += ' AND ps.activation_date >= ?';
      dateParams.push(date_from);
    }
    if (date_to) {
      dateFilter += ' AND ps.activation_date <= ?';
      dateParams.push(date_to);
    }
    
    // Get detailed breakdown by project type
    const sql = `
      SELECT 
        pt.id,
        pt.name,
        pt.code_prefix,
        pt.color_code,
        pt.description,
        COUNT(*) as total_projects,
        SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN ps.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        COUNT(DISTINCT ps.province_id) as provinces_count,
        COUNT(DISTINCT ps.municipality_id) as municipalities_count,
        MIN(ps.activation_date) as earliest_activation,
        MAX(ps.activation_date) as latest_activation,
        ROUND(SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_rate
      FROM project_types pt
      LEFT JOIN project_sites ps ON pt.id = ps.project_type_id ${dateFilter.replace('ps.', 'ps.')}
      GROUP BY pt.id, pt.name, pt.code_prefix, pt.color_code, pt.description
      ORDER BY total_projects DESC
    `;
    
    const data = await query(sql, dateParams);
    
    // Get province distribution for each project type
    const provinceDistSql = `
      SELECT 
        pt.name as project_type,
        p.name as province,
        COUNT(*) as count
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      JOIN provinces p ON ps.province_id = p.id
      WHERE 1=1 ${dateFilter}
      GROUP BY pt.name, p.name
      ORDER BY pt.name, count DESC
    `;
    
    const provinceDistribution = await query(provinceDistSql, dateParams);
    
    // Group province distribution by project type
    const provinceDistByType = {};
    for (const row of provinceDistribution) {
      if (!provinceDistByType[row.project_type]) {
        provinceDistByType[row.project_type] = [];
      }
      provinceDistByType[row.project_type].push({
        province: row.province,
        count: row.count
      });
    }
    
    res.json(success({
      data: {
        project_types: data.map(pt => ({
          ...pt,
          province_distribution: provinceDistByType[pt.name] || []
        }))
      },
      message: 'Project type analysis retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get performance metrics
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getPerformance = async (req, res, next) => {
  try {
    // Average time to completion
    const completionTimeSql = `
      SELECT 
        pt.name as project_type,
        AVG(DATEDIFF(ps.updated_at, ps.created_at)) as avg_days_to_complete,
        COUNT(*) as completed_count
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      WHERE ps.status = 'Done'
      GROUP BY pt.id, pt.name
    `;
    
    const completionTimes = await query(completionTimeSql);
    
    // Status change frequency
    const statusChangesSql = `
      SELECT 
        new_status,
        COUNT(*) as change_count,
        AVG(CASE 
          WHEN old_status = 'Pending' THEN 1
          WHEN old_status = 'In Progress' THEN 2
          WHEN old_status = 'Done' THEN 3
          WHEN old_status = 'Cancelled' THEN 4
          WHEN old_status = 'On Hold' THEN 5
        END) as avg_previous_status_order
      FROM project_status_history
      GROUP BY new_status
      ORDER BY change_count DESC
    `;
    
    const statusChanges = await query(statusChangesSql);
    
    // Recent activity (last 30 days)
    const recentActivitySql = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as projects_created,
        SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as projects_completed
      FROM project_sites
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const recentActivity = await query(recentActivitySql);
    
    res.json(success({
      data: {
        completion_times: completionTimes,
        status_changes: statusChanges,
        recent_activity: recentActivity
      },
      message: 'Performance metrics retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Build export filter conditions
 * @param {Object} query - Request query parameters
 * @returns {Object} - Filter conditions and parameters
 */
const buildExportFilters = (query) => {
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (query.province_id) {
    whereClause += ' AND ps.province_id = ?';
    params.push(parseInt(query.province_id));
  }
  
  if (query.status) {
    whereClause += ' AND ps.status = ?';
    params.push(query.status);
  }
  
  if (query.project_type_id) {
    whereClause += ' AND ps.project_type_id = ?';
    params.push(parseInt(query.project_type_id));
  }
  
  if (query.date_from) {
    whereClause += ' AND ps.activation_date >= ?';
    params.push(query.date_from);
  }
  
  if (query.date_to) {
    whereClause += ' AND ps.activation_date <= ?';
    params.push(query.date_to);
  }
  
  return { whereClause, params };
};

/**
 * Get export data query
 * @param {string} whereClause - WHERE clause
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} - Project data for export
 */
const getExportData = async (whereClause, params) => {
  const sql = `
    SELECT
      ps.site_code,
      ps.site_name,
      p.name AS province,
      m.name AS municipality,
      b.name AS barangay,
      pt.name AS project_type,
      ps.status,
      ps.activation_date,
      ps.latitude,
      ps.longitude,
      ps.remarks,
      ps.created_at,
      ps.updated_at,
      u.full_name AS created_by_name
    FROM project_sites ps
    JOIN project_types pt ON ps.project_type_id = pt.id
    JOIN provinces p ON ps.province_id = p.id
    JOIN municipalities m ON ps.municipality_id = m.id
    LEFT JOIN barangays b ON ps.barangay_id = b.id
    LEFT JOIN users u ON ps.created_by = u.id
    ${whereClause}
    ORDER BY ps.site_code
  `;
  
  return await query(sql, params);
};

/**
 * Convert data to CSV format
 * @param {Array} data - Array of objects to convert
 * @returns {string} - CSV string
 */
const convertToCSV = (data) => {
  if (data.length === 0) return '';
  
  const headers = [
    'Site ID',
    'Site Name',
    'Province',
    'Municipality',
    'Barangay',
    'Project Type',
    'Status',
    'Activation Date',
    'Latitude',
    'Longitude',
    'Remarks',
    'Created At',
    'Updated At',
    'Created By'
  ];
  
  // Escape function for CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // If value contains comma, quote, or newline, wrap in quotes and escape inner quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  // Build CSV
  const csvLines = [headers.join(',')];
  
  for (const row of data) {
    const values = [
      escapeCSV(row.site_code),
      escapeCSV(row.site_name),
      escapeCSV(row.province),
      escapeCSV(row.municipality),
      escapeCSV(row.barangay),
      escapeCSV(row.project_type),
      escapeCSV(row.status),
      escapeCSV(row.activation_date ? new Date(row.activation_date).toISOString().split('T')[0] : ''),
      escapeCSV(row.latitude),
      escapeCSV(row.longitude),
      escapeCSV(row.remarks),
      escapeCSV(row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : ''),
      escapeCSV(row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : ''),
      escapeCSV(row.created_by_name)
    ];
    csvLines.push(values.join(','));
  }
  
  return csvLines.join('\n');
};

/**
 * Export report data as CSV
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.exportCSV = async (req, res, next) => {
  try {
    const { whereClause, params } = buildExportFilters(req.query);
    const data = await getExportData(whereClause, params);
    
    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found for the selected filters'
      });
    }
    
    const csv = convertToCSV(data);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `project_report_${timestamp}.csv`;
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Add BOM for Excel compatibility with UTF-8
    const bom = '\uFEFF';
    res.send(bom + csv);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Export summary report as PDF
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.exportSummaryPDF = async (req, res, next) => {
  try {
    // Get summary data using existing function
    const { date_from, date_to } = req.query;
    
    // Build date filter
    let dateFilter = '';
    const dateParams = [];
    
    if (date_from) {
      dateFilter += ' AND ps.activation_date >= ?';
      dateParams.push(date_from);
    }
    if (date_to) {
      dateFilter += ' AND ps.activation_date <= ?';
      dateParams.push(date_to);
    }
    
    // Get overall statistics
    const summarySql = `
      SELECT
        COUNT(*) as total_projects,
        SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN ps.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN ps.status = 'On Hold' THEN 1 ELSE 0 END) as on_hold,
        COUNT(DISTINCT ps.province_id) as provinces_with_projects,
        COUNT(DISTINCT ps.municipality_id) as municipalities_with_projects,
        COUNT(DISTINCT ps.project_type_id) as active_project_types
      FROM project_sites ps
      WHERE 1=1 ${dateFilter}
    `;
    
    const [summary] = await query(summarySql, dateParams);
    summary.completion_rate = summary.total_projects > 0
      ? Math.round((summary.done / summary.total_projects) * 100)
      : 0;
    
    // Get monthly trends
    const trendsSql = `
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as completed
      FROM project_sites
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
    `;
    
    const trends = await query(trendsSql);
    
    // Get recent activity
    const recentSql = `
      SELECT
        ps.site_code,
        ps.site_name,
        ps.status,
        pt.name as project_type,
        pt.color_code,
        p.name as province,
        ps.updated_at
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      JOIN provinces p ON ps.province_id = p.id
      ORDER BY ps.updated_at DESC
      LIMIT 10
    `;
    
    const recentActivity = await query(recentSql);
    
    const reportData = {
      data: {
        summary,
        trends,
        recent_activity: recentActivity
      }
    };
    
    const pdfBuffer = await pdfGenerator.generateSummaryReportPDF(reportData);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `summary_report_${timestamp}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Export status report as PDF
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.exportStatusPDF = async (req, res, next) => {
  try {
    const { date_from, date_to, group_by = 'project_type' } = req.query;
    
    // Build date filter
    let dateFilter = '';
    const dateParams = [];
    
    if (date_from) {
      dateFilter += ' AND ps.activation_date >= ?';
      dateParams.push(date_from);
    }
    if (date_to) {
      dateFilter += ' AND ps.activation_date <= ?';
      dateParams.push(date_to);
    }
    
    let sql;
    
    if (group_by === 'project_type') {
      sql = `
        SELECT
          pt.id as project_type_id,
          pt.name as project_type,
          pt.color_code,
          COUNT(*) as total,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN ps.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN ps.status = 'On Hold' THEN 1 ELSE 0 END) as on_hold,
          ROUND(SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_percentage
        FROM project_sites ps
        JOIN project_types pt ON ps.project_type_id = pt.id
        WHERE 1=1 ${dateFilter}
        GROUP BY pt.id, pt.name, pt.color_code
        ORDER BY total DESC
      `;
    } else if (group_by === 'province') {
      sql = `
        SELECT
          p.id as province_id,
          p.name as province,
          COUNT(*) as total,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN ps.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN ps.status = 'On Hold' THEN 1 ELSE 0 END) as on_hold,
          ROUND(SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_percentage
        FROM project_sites ps
        JOIN provinces p ON ps.province_id = p.id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.id, p.name
        ORDER BY total DESC
      `;
    } else {
      sql = `
        SELECT
          status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM project_sites WHERE 1=1 ${dateFilter}), 2) as percentage
        FROM project_sites ps
        WHERE 1=1 ${dateFilter}
        GROUP BY status
        ORDER BY count DESC
      `;
    }
    
    const data = await query(sql, [...dateParams, ...dateParams]);
    const total = data.reduce((sum, row) => sum + (row.total || row.count), 0);
    
    const reportData = {
      data: {
        breakdown: data,
        total,
        group_by
      }
    };
    
    const pdfBuffer = await pdfGenerator.generateStatusReportPDF(reportData);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `status_report_${timestamp}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Export location report as PDF
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.exportLocationPDF = async (req, res, next) => {
  try {
    const { date_from, date_to, level = 'province' } = req.query;
    
    // Build date filter
    let dateFilter = '';
    const dateParams = [];
    
    if (date_from) {
      dateFilter += ' AND ps.activation_date >= ?';
      dateParams.push(date_from);
    }
    if (date_to) {
      dateFilter += ' AND ps.activation_date <= ?';
      dateParams.push(date_to);
    }
    
    let sql;
    
    if (level === 'municipality') {
      sql = `
        SELECT
          p.name as province,
          m.name as municipality,
          COUNT(*) as total_projects,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
          COUNT(DISTINCT ps.project_type_id) as project_types
        FROM project_sites ps
        JOIN provinces p ON ps.province_id = p.id
        JOIN municipalities m ON ps.municipality_id = m.id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.name, m.name
        ORDER BY total_projects DESC
      `;
    } else {
      sql = `
        SELECT
          p.id as province_id,
          p.name as province,
          p.region_code,
          COUNT(*) as total_projects,
          SUM(CASE WHEN ps.status = 'Done' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN ps.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN ps.status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN ps.status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
          COUNT(DISTINCT ps.municipality_id) as municipalities_count,
          COUNT(DISTINCT ps.project_type_id) as project_types
        FROM project_sites ps
        JOIN provinces p ON ps.province_id = p.id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.id, p.name, p.region_code
        ORDER BY total_projects DESC
      `;
    }
    
    const locations = await query(sql, dateParams);
    
    // Get summary statistics
    const summarySql = `
      SELECT
        COUNT(DISTINCT ps.province_id) as provinces_with_projects,
        COUNT(DISTINCT ps.municipality_id) as municipalities_with_projects,
        COUNT(DISTINCT ps.barangay_id) as barangays_with_projects
      FROM project_sites ps
      WHERE 1=1 ${dateFilter}
    `;
    
    const [summary] = await query(summarySql, dateParams);
    
    const reportData = {
      data: {
        locations,
        summary
      },
      level
    };
    
    const pdfBuffer = await pdfGenerator.generateLocationReportPDF(reportData);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `location_report_${timestamp}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Export projects list as PDF
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.exportProjectsPDF = async (req, res, next) => {
  try {
    const { whereClause, params } = buildExportFilters(req.query);
    const projects = await getExportData(whereClause, params);
    
    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found for the selected filters'
      });
    }
    
    // Build filters object for display
    const filters = {};
    if (req.query.province_id) filters['Province'] = `ID: ${req.query.province_id}`;
    if (req.query.status) filters['Status'] = req.query.status;
    if (req.query.project_type_id) filters['Project Type'] = `ID: ${req.query.project_type_id}`;
    if (req.query.date_from) filters['From Date'] = req.query.date_from;
    if (req.query.date_to) filters['To Date'] = req.query.date_to;
    
    const pdfBuffer = await pdfGenerator.generateProjectsPDF(projects, {
      title: 'Project Export',
      subtitle: `Filtered export containing ${projects.length} projects`,
      filters
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `projects_export_${timestamp}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Export report data as Excel (XLSX)
 * For now, exports as CSV with Excel MIME type for compatibility
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.exportExcel = async (req, res, next) => {
  try {
    const { whereClause, params } = buildExportFilters(req.query);
    const data = await getExportData(whereClause, params);
    
    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found for the selected filters'
      });
    }
    
    const csv = convertToCSV(data);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `project_report_${timestamp}.xlsx`;
    
    // Set headers for Excel file download (using CSV content with Excel MIME type as fallback)
    // Browsers will open this with Excel by default
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Send as CSV data - Excel can open this
    // Add BOM for proper UTF-8 handling in Excel
    const bom = '\uFEFF';
    res.send(bom + csv);
    
  } catch (error) {
    next(error);
  }
};
