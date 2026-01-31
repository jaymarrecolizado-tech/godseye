/**
 * Geo Controller
 * Business logic for geospatial operations
 */

const { query, buildPagination } = require('../config/database');
const { success, paginated, STATUS_CODES } = require('../utils/response');

/**
 * Get GeoJSON data for map display
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getMapData = async (req, res, next) => {
  try {
    const { 
      status, 
      project_type_id, 
      province_id, 
      municipality_id,
      date_from,
      date_to
    } = req.query;
    
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
    
    if (date_from) {
      conditions.push('ps.activation_date >= ?');
      params.push(date_from);
    }
    
    if (date_to) {
      conditions.push('ps.activation_date <= ?');
      params.push(date_to);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get all projects with coordinates
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
        p.name as province,
        m.name as municipality,
        b.name as barangay
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      JOIN provinces p ON ps.province_id = p.id
      JOIN municipalities m ON ps.municipality_id = m.id
      LEFT JOIN barangays b ON ps.barangay_id = b.id
      ${whereClause}
      ORDER BY ps.id
    `;
    
    const projects = await query(sql, params);
    
    // Convert to GeoJSON FeatureCollection
    const features = projects.map(project => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(project.longitude), parseFloat(project.latitude)]
      },
      properties: {
        id: project.id,
        site_code: project.site_code,
        site_name: project.site_name,
        project_type: project.project_type,
        project_type_id: project.project_type_id,
        code_prefix: project.code_prefix,
        color_code: project.color_code,
        status: project.status,
        activation_date: project.activation_date,
        province: project.province,
        municipality: project.municipality,
        barangay: project.barangay,
        remarks: project.remarks
      }
    }));
    
    const geoJson = {
      type: 'FeatureCollection',
      features,
      metadata: {
        total: features.length,
        generated_at: new Date().toISOString()
      }
    };
    
    res.json(success({
      data: geoJson,
      message: 'Map data retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Find projects within a radius
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getNearbyProjects = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10, page, limit } = req.query;
    
    const { limit: limitNum, offset } = buildPagination(page, limit);
    const radiusKm = parseFloat(radius);
    
    // Use Haversine formula for distance calculation
    // since we don't have a spatial 'location' column
    const countSql = `
      SELECT COUNT(*) as total
      FROM project_sites ps
      WHERE (
        6371 * acos(
          cos(radians(?)) * cos(radians(ps.latitude)) *
          cos(radians(ps.longitude) - radians(?)) +
          sin(radians(?)) * sin(radians(ps.latitude))
        )
      ) <= ?
    `;
    
    const [countResult] = await query(countSql, [lat, lng, lat, radiusKm]);
    const total = countResult.total;
    
    // Get nearby projects with calculated distance
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
        p.name as province,
        m.name as municipality,
        b.name as barangay,
        ROUND(
          6371 * acos(
            cos(radians(?)) * cos(radians(ps.latitude)) *
            cos(radians(ps.longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(ps.latitude))
          ), 2
        ) as distance_km
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      JOIN provinces p ON ps.province_id = p.id
      JOIN municipalities m ON ps.municipality_id = m.id
      LEFT JOIN barangays b ON ps.barangay_id = b.id
      HAVING distance_km <= ?
      ORDER BY distance_km ASC
      LIMIT ? OFFSET ?
    `;
    
    const projects = await query(projectsSql, [lat, lng, lat, radiusKm, limitNum, offset]);
    
    res.json(paginated(
      projects,
      { page: page || 1, limit: limitNum, total },
      `Found ${total} projects within ${radius}km radius`
    ));
  } catch (error) {
    next(error);
  }
};

/**
 * Get projects within a bounding box (viewport query)
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getProjectsInBoundingBox = async (req, res, next) => {
  try {
    const { north, south, east, west, filters = {} } = req.body;
    
    // Build additional filters
    const conditions = [
      'ps.latitude BETWEEN ? AND ?',
      'ps.longitude BETWEEN ? AND ?'
    ];
    const params = [south, north, west, east];
    
    if (filters.status) {
      conditions.push('ps.status = ?');
      params.push(filters.status);
    }
    
    if (filters.project_type_id) {
      conditions.push('ps.project_type_id = ?');
      params.push(filters.project_type_id);
    }
    
    if (filters.province_id) {
      conditions.push('ps.province_id = ?');
      params.push(filters.province_id);
    }
    
    if (filters.municipality_id) {
      conditions.push('ps.municipality_id = ?');
      params.push(filters.municipality_id);
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Get projects within bounding box using latitude/longitude comparison
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
        p.name as province,
        m.name as municipality,
        b.name as barangay
      FROM project_sites ps
      JOIN project_types pt ON ps.project_type_id = pt.id
      JOIN provinces p ON ps.province_id = p.id
      JOIN municipalities m ON ps.municipality_id = m.id
      LEFT JOIN barangays b ON ps.barangay_id = b.id
      ${whereClause}
      ORDER BY ps.id
    `;
    
    const projects = await query(sql, params);
    
    // Convert to GeoJSON
    const features = projects.map(project => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(project.longitude), parseFloat(project.latitude)]
      },
      properties: {
        id: project.id,
        site_code: project.site_code,
        site_name: project.site_name,
        project_type: project.project_type,
        project_type_id: project.project_type_id,
        code_prefix: project.code_prefix,
        color_code: project.color_code,
        status: project.status,
        activation_date: project.activation_date,
        province: project.province,
        municipality: project.municipality,
        barangay: project.barangay
      }
    }));
    
    const geoJson = {
      type: 'FeatureCollection',
      features,
      metadata: {
        total: features.length,
        bounds: { north, south, east, west },
        generated_at: new Date().toISOString()
      }
    };
    
    res.json(success({
      data: geoJson,
      message: `Found ${features.length} projects in the specified area`
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get project clusters for heatmap display
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getClusters = async (req, res, next) => {
  try {
    const { 
      status, 
      project_type_id, 
      precision = 2 // Decimal precision for clustering (higher = more precise/smaller clusters)
    } = req.query;
    
    const conditions = [];
    const params = [];
    
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    
    if (project_type_id) {
      conditions.push('project_type_id = ?');
      params.push(project_type_id);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Cluster projects by rounded coordinates
    const sql = `
      SELECT 
        ROUND(latitude, ?) as lat_grid,
        ROUND(longitude, ?) as lng_grid,
        COUNT(*) as project_count,
        GROUP_CONCAT(site_code SEPARATOR ', ') as site_codes,
        GROUP_CONCAT(id SEPARATOR ',') as project_ids
      FROM project_sites
      ${whereClause}
      GROUP BY lat_grid, lng_grid
      ORDER BY project_count DESC
    `;
    
    const clusters = await query(sql, [parseInt(precision), parseInt(precision), ...params]);
    
    // Convert to GeoJSON
    const features = clusters.map(cluster => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(cluster.lng_grid), parseFloat(cluster.lat_grid)]
      },
      properties: {
        count: cluster.project_count,
        site_codes: cluster.site_codes,
        project_ids: cluster.project_ids.split(',').map(Number)
      }
    }));
    
    const geoJson = {
      type: 'FeatureCollection',
      features,
      metadata: {
        total_clusters: features.length,
        precision: parseInt(precision),
        generated_at: new Date().toISOString()
      }
    };
    
    res.json(success({
      data: geoJson,
      message: 'Cluster data retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get boundary data for provinces/municipalities
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getBoundary = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    
    let sql;
    let params = [id];
    
    switch (type) {
      case 'province':
        sql = `
          SELECT 
            id,
            name,
            ST_AsGeoJSON(boundary) as geometry,
            ST_AsGeoJSON(centroid) as centroid
          FROM provinces
          WHERE id = ? AND boundary IS NOT NULL
        `;
        break;
      case 'municipality':
        sql = `
          SELECT 
            m.id,
            m.name,
            p.name as province,
            ST_AsGeoJSON(m.centroid) as centroid
          FROM municipalities m
          JOIN provinces p ON m.province_id = p.id
          WHERE m.id = ? AND m.centroid IS NOT NULL
        `;
        break;
      default:
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: 'Bad Request',
          message: 'Invalid boundary type. Must be "province" or "municipality"'
        });
    }
    
    const [boundary] = await query(sql, params);
    
    if (!boundary) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Boundary data not found for the specified location'
      });
    }
    
    // Parse GeoJSON strings
    if (boundary.geometry) {
      boundary.geometry = JSON.parse(boundary.geometry);
    }
    if (boundary.centroid) {
      boundary.centroid = JSON.parse(boundary.centroid);
    }
    
    res.json(success({
      data: boundary,
      message: 'Boundary data retrieved successfully'
    }));
  } catch (error) {
    next(error);
  }
};
