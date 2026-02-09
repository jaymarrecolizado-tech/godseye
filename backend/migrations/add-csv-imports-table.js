/**
 * Migration: Add CSV Imports Table
 * Creates the csv_imports table for tracking CSV import jobs
 */

const { query } = require('../src/config/database');

async function up() {
  console.log('Creating csv_imports table...');
  
  try {
    // Create table without foreign key first
    await query(`
      CREATE TABLE IF NOT EXISTS csv_imports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255),
        total_rows INT DEFAULT 0,
        success_count INT DEFAULT 0,
        error_count INT DEFAULT 0,
        errors JSON,
        imported_by INT,
        status ENUM('Pending', 'Processing', 'Completed', 'Failed', 'Partial') DEFAULT 'Pending',
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✓ csv_imports table created successfully');
    
    // Try to add foreign key constraint (may fail if users table doesn't exist yet)
    try {
      await query(`
        ALTER TABLE csv_imports
        ADD CONSTRAINT fk_csv_imports_imported_by
        FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✓ Foreign key constraint added');
    } catch (fkError) {
      console.log('  Note: Could not add foreign key constraint (users table may not exist yet)');
    }
    
    return true;
  } catch (error) {
    console.error('Error creating csv_imports table:', error.message);
    throw error;
  }
}

async function down() {
  console.log('Dropping csv_imports table...');
  
  try {
    await query('DROP TABLE IF EXISTS csv_imports');
    console.log('✓ csv_imports table dropped successfully');
    return true;
  } catch (error) {
    console.error('Error dropping csv_imports table:', error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
