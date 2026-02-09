/**
 * Fix Database Schema - Add missing columns and tables
 * Compatible with MySQL 5.7+
 */

const { query } = require('./src/config/database');

async function fixSchema() {
  console.log('🔧 Fixing database schema...\n');

  try {
    // 1. Add columns to project_sites table
    console.log('1. Adding columns to project_sites table...');
    const columns = [
      { name: 'implementing_agency', type: 'VARCHAR(150)' },
      { name: 'budget', type: 'DECIMAL(15,2)' },
      { name: 'description', type: 'TEXT' },
      { name: 'expected_output', type: 'TEXT' },
      { name: 'start_date', type: 'DATE' },
      { name: 'end_date', type: 'DATE' }
    ];

    for (const col of columns) {
      try {
        // Check if column exists
        const [result] = await query(`
          SELECT COUNT(*) as count FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = 'project_sites'
          AND column_name = '${col.name}'
        `);
        
        if (result.count === 0) {
          await query(`ALTER TABLE project_sites ADD COLUMN ${col.name} ${col.type}`);
          console.log(`   ✓ Added column: ${col.name}`);
        } else {
          console.log(`   ℹ Column ${col.name} already exists`);
        }
      } catch (error) {
        console.log(`   ✗ Error with ${col.name}: ${error.message}`);
      }
    }

    // 2. Add last_login to users table
    console.log('\n2. Checking users table columns...');
    try {
      const [result] = await query(`
        SELECT COUNT(*) as count FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = 'last_login'
      `);
      
      if (result.count === 0) {
        await query(`ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL`);
        console.log('   ✓ Added column: last_login');
      } else {
        console.log('   ℹ Column last_login already exists');
      }
    } catch (error) {
      console.log(`   ✗ Error: ${error.message}`);
    }

    // 3. Create notifications table
    console.log('\n3. Creating notifications table...');
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          data JSON,
          is_read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✓ notifications table created');
    } catch (error) {
      console.log(`   ✗ Error: ${error.message}`);
    }

    // 4. Fix audit_logs table columns
    console.log('\n4. Checking audit_logs table...');
    const auditColumns = ['table_name', 'record_id', 'old_values', 'new_values'];
    for (const col of auditColumns) {
      try {
        const [result] = await query(`
          SELECT COUNT(*) as count FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = 'audit_logs'
          AND column_name = '${col}'
        `);
        
        if (result.count === 0) {
          console.log(`   ⚠ Column ${col} missing in audit_logs`);
        } else {
          console.log(`   ✓ Column ${col} exists`);
        }
      } catch (error) {
        console.log(`   ✗ Error checking ${col}: ${error.message}`);
      }
    }

    // 5. Add foreign key to csv_imports
    console.log('\n5. Adding foreign key to csv_imports...');
    try {
      await query(`
        ALTER TABLE csv_imports 
        ADD CONSTRAINT fk_csv_imports_imported_by 
        FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('   ✓ Foreign key added to csv_imports');
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        console.log('   ℹ Foreign key already exists');
      } else {
        console.log(`   ℹ Could not add foreign key: ${error.message}`);
      }
    }

    console.log('\n✅ Schema fix completed!');
  } catch (error) {
    console.error('\n❌ Schema fix failed:', error.message);
  } finally {
    process.exit(0);
  }
}

fixSchema();
