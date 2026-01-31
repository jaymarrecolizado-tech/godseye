/**
 * Apply database schema using Node.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function applySchema() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Connected to MySQL. Applying schema...\n');
    
    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS project_tracking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log('✓ Database created');
    
    // Use database
    await connection.query(`USE project_tracking;`);
    console.log('✓ Using project_tracking database');
    
    // Read schema and split into individual statements
    const schemaPath = path.join(__dirname, '..', 'database', 'schema-simple.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by '-- ' comments to separate table creation statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s.includes('CREATE TABLE'));
    
    // Create tables in order (no foreign keys first)
    const tableOrder = [
      'provinces',
      'districts', 
      'municipalities',
      'barangays',
      'project_types',
      'users',
      'project_sites',
      'project_status_history',
      'audit_logs',
      'csv_imports'
    ];
    
    for (const tableName of tableOrder) {
      const stmt = statements.find(s => s.includes(`CREATE TABLE IF NOT EXISTS ${tableName}`));
      if (stmt) {
        await connection.query(stmt + ';');
        console.log(`✓ Created table: ${tableName}`);
      }
    }
    console.log('✓ Schema applied');
    
    // Insert project types
    console.log('Inserting project types...');
    await connection.query(`
      INSERT INTO project_types (name, code_prefix, description, color_code) VALUES
      ('Free-WIFI for All', 'WF', 'Free WiFi for All Program', '#22c55e'),
      ('PNPKI', 'PK', 'Philippine National Public Key Infrastructure', '#ef4444'),
      ('IIDB', 'ID', 'ICT Infrastructure Development Branch', '#3b82f6'),
      ('eLGU', 'EL', 'eLocal Government Unit', '#eab308')
      ON DUPLICATE KEY UPDATE name = VALUES(name);
    `);
    console.log('✓ Project types inserted');
    
    // Insert users with proper password hashes
    console.log('Inserting users...');
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync('password123', 10);
    
    await connection.query(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, is_active) VALUES
      (1, 'admin', 'admin@example.com', ?, 'System Administrator', 'Admin', true),
      (2, 'manager', 'manager@example.com', ?, 'Project Manager', 'Manager', true),
      (3, 'editor', 'editor@example.com', ?, 'Content Editor', 'Editor', true),
      (4, 'viewer', 'viewer@example.com', ?, 'View Only User', 'Viewer', true)
      ON DUPLICATE KEY UPDATE username = VALUES(username);
    `, [passwordHash, passwordHash, passwordHash, passwordHash]);
    console.log('✓ Users inserted');
    
    console.log('\n✓ Database setup complete!');
    
  } catch (error) {
    console.error('Error applying schema:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

applySchema().catch(console.error);
