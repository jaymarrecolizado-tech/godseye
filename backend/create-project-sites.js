/**
 * Create project_sites table and migrate data if needed
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'project_tracking',
  multipleStatements: true
};

async function createProjectSites() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Creating project_sites table...\n');
    
    // Create project_sites table without FK constraints first
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_sites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        site_code VARCHAR(30) NOT NULL,
        project_type_id INT NOT NULL,
        site_name VARCHAR(150) NOT NULL,
        barangay_id INT,
        municipality_id INT NOT NULL,
        province_id INT NOT NULL,
        district_id INT,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        activation_date DATE,
        status ENUM('Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold') DEFAULT 'Pending',
        remarks TEXT,
        metadata JSON,
        created_by INT,
        updated_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_site_code (site_code),
        INDEX idx_status (status),
        INDEX idx_activation_date (activation_date),
        INDEX idx_project_type (project_type_id),
        INDEX idx_province (province_id),
        INDEX idx_municipality (municipality_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ project_sites table created');
    
    // Check if projects table exists and has data
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'project_tracking' AND TABLE_NAME = 'projects'
    `);
    
    if (tables.length > 0) {
      console.log('Found existing projects table, checking for data...');
      const [count] = await connection.query('SELECT COUNT(*) as cnt FROM projects');
      console.log(`  Projects table has ${count[0].cnt} records`);
      
      // Migrate data from projects to project_sites if needed
      // (This would depend on the structure of the projects table)
    }
    
    // Create project_status_history table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_site_id INT NOT NULL,
        old_status ENUM('Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold'),
        new_status ENUM('Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold') NOT NULL,
        reason TEXT,
        changed_by INT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_site_id) REFERENCES project_sites(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ project_status_history table created');
    
    console.log('\n✓ All tables created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

createProjectSites().catch(console.error);
