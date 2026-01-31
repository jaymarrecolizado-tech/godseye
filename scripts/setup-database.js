/**
 * Database Setup Script
 * Creates the project_tracking database and runs schema/seeds
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function setupDatabase() {
  let connection;
  
  try {
    // Connect without database
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected to MySQL');
    
    // Create database
    console.log('Creating database...');
    await connection.execute(`
      CREATE DATABASE IF NOT EXISTS project_tracking 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci
    `);
    console.log('✓ Database created');
    
    // Use the database
    await connection.query('USE project_tracking');
    console.log('✓ Using project_tracking database');
    
    // Read and execute schema
    console.log('Running schema...');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('✓ Schema applied');
    
    // Run seed files
    console.log('Running seeds...');
    const seedsDir = path.join(__dirname, '..', 'database', 'seeds');
    const seedFiles = await fs.readdir(seedsDir);
    
    for (const file of seedFiles.sort()) {
      if (file.endsWith('.sql')) {
        console.log(`  - Processing ${file}...`);
        const seedSql = await fs.readFile(path.join(seedsDir, file), 'utf8');
        await connection.query(seedSql);
      }
    }
    console.log('✓ Seeds applied');
    
    console.log('\n✓ Database setup complete!');
    
  } catch (error) {
    console.error('✗ Setup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
