/**
 * Database Configuration
 * MySQL connection pool using mysql2/promise
 */

const mysql = require('mysql2/promise');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  database: process.env.DB_NAME || 'project_tracking',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  // Connection pool settings
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
  queueLimit: 0,
  // Enable multiple statements for complex queries
  multipleStatements: false,
  // Connection timeout
  connectTimeout: 10000,
  // Acquire timeout
  acquireTimeout: 60000,
  // Timeout for queries
  timeout: 60000,
  // Enable date strings to avoid timezone issues
  dateStrings: true,
  // Timezone configuration
  timezone: '+00:00',
  // SSL configuration (for production)
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: true
  } : undefined
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection on startup
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1 as test');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Database connection failed');
    return false;
  }
};

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Connection wrapper with error handling
const query = async (sql, params) => {
  let connection;
  try {
    connection = await pool.getConnection();
    // Use query() instead of execute() to avoid prepared statement limitations
    // This allows LIMIT and other clauses to work with dynamic values
    const [results] = await connection.query(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Transaction wrapper
const transaction = async (callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const result = await callback(connection);
    
    await connection.commit();
    return result;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get a single connection (for complex operations)
const getConnection = async () => {
  return await pool.getConnection();
};

// Set current user for audit triggers
const setCurrentUser = async (userId) => {
  await pool.execute('SET @current_user_id = ?', [userId]);
};

// Helper function to build pagination
const buildPagination = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;
  
  return { page: pageNum, limit: limitNum, offset };
};

// Helper function to build WHERE clauses for filtering
const buildWhereClause = (filters) => {
  const conditions = [];
  const params = [];
  
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        conditions.push(`${key} IN (${value.map(() => '?').join(', ')})`);
        params.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        // Handle operators like { operator: '>', value: 5 }
        conditions.push(`${key} ${value.operator} ?`);
        params.push(value.value);
      } else {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }
  }
  
  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';
  
  return { whereClause, params };
};

// Format spatial point for MySQL
const formatPoint = (latitude, longitude) => {
  return `POINT(${longitude} ${latitude})`;
};

// Parse spatial point from MySQL result
const parsePoint = (pointString) => {
  if (!pointString) return null;
  // POINT(longitude latitude) format
  const match = pointString.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (match) {
    return {
      longitude: parseFloat(match[1]),
      latitude: parseFloat(match[2])
    };
  }
  return null;
};

module.exports = {
  pool,
  query,
  transaction,
  getConnection,
  setCurrentUser,
  testConnection,
  buildPagination,
  buildWhereClause,
  formatPoint,
  parsePoint
};
