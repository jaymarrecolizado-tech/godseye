/**
 * Migration: Add Project Fields and Accomplishments Table
 * Adds additional fields to project_sites and creates accomplishments table
 */

const { query } = require('../src/config/database');

async function up() {
  console.log('Adding additional project fields...');
  
  try {
    // Add new columns to project_sites table
    const columns = [
      { name: 'implementing_agency', type: 'VARCHAR(150)', after: 'site_name' },
      { name: 'budget', type: 'DECIMAL(15,2)', after: 'implementing_agency' },
      { name: 'description', type: 'TEXT', after: 'budget' },
      { name: 'expected_output', type: 'TEXT', after: 'description' },
      { name: 'start_date', type: 'DATE', after: 'activation_date' },
      { name: 'end_date', type: 'DATE', after: 'start_date' }
    ];

    // Check if project_sites table exists
    const [projectSitesTable] = await query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'project_sites'
    `);
    
    if (projectSitesTable.count === 0) {
      console.log('  Note: project_sites table does not exist yet. Skipping column additions.');
    } else {
      for (const col of columns) {
        try {
          await query(`
            ALTER TABLE project_sites
            ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
            AFTER ${col.after}
          `);
          console.log(`✓ Added column: ${col.name}`);
        } catch (error) {
          // Column might already exist
          if (error.message.includes('Duplicate column')) {
            console.log(`  Column ${col.name} already exists, skipping`);
          } else {
            console.log(`  Error adding column ${col.name}: ${error.message}`);
          }
        }
      }
    }

    // Create accomplishments table
    console.log('Creating accomplishments table...');
    await query(`
      CREATE TABLE IF NOT EXISTS accomplishments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_site_id INT NOT NULL,
        accomplishment_date DATE NOT NULL,
        description TEXT NOT NULL,
        percentage_complete DECIMAL(5,2) DEFAULT 0,
        actual_output TEXT,
        remarks TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_project_site (project_site_id),
        INDEX idx_accomplishment_date (accomplishment_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ accomplishments table created successfully');
    
    // Try to add foreign keys (may fail if referenced tables don't exist)
    try {
      await query(`
        ALTER TABLE accomplishments
        ADD CONSTRAINT fk_accomplishments_project_site
        FOREIGN KEY (project_site_id) REFERENCES project_sites(id) ON DELETE CASCADE
      `);
      console.log('✓ Added foreign key: project_site_id');
    } catch (fkError) {
      console.log('  Note: Could not add project_site_id foreign key (project_sites table may not exist yet)');
    }
    
    try {
      await query(`
        ALTER TABLE accomplishments
        ADD CONSTRAINT fk_accomplishments_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✓ Added foreign key: created_by');
    } catch (fkError) {
      console.log('  Note: Could not add created_by foreign key (users table may not exist yet)');
    }

    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error during migration:', error.message);
    throw error;
  }
}

async function down() {
  console.log('Reverting migration...');
  
  try {
    // Drop accomplishments table (foreign keys will be dropped automatically)
    await query('DROP TABLE IF EXISTS accomplishments');
    console.log('✓ accomplishments table dropped');

    // Remove added columns from project_sites
    const columns = ['implementing_agency', 'budget', 'description', 'expected_output', 'start_date', 'end_date'];
    
    for (const col of columns) {
      try {
        // Check if column exists before trying to drop
        const [colExists] = await query(`
          SELECT COUNT(*) as count FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = 'project_sites'
          AND column_name = '${col}'
        `);
        
        if (colExists.count > 0) {
          await query(`ALTER TABLE project_sites DROP COLUMN ${col}`);
          console.log(`✓ Dropped column: ${col}`);
        } else {
          console.log(`  Column ${col} does not exist, skipping`);
        }
      } catch (error) {
        console.log(`  Error dropping column ${col}: ${error.message}`);
      }
    }

    console.log('Rollback completed successfully');
    return true;
  } catch (error) {
    console.error('Error during rollback:', error.message);
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
