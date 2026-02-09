/**
 * Fix Audit Logs Table Schema - Final
 * Adds all missing columns including created_at, user_id, ip_address, user_agent
 */

const { query } = require('../src/config/database');

async function fixAuditLogsFinal() {
  console.log('🔧 Fixing audit_logs table - Final Migration...\n');

  try {
    // Check if table exists
    const [tableExists] = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'audit_logs'
    `);

    if (tableExists.count === 0) {
      console.log('   Creating audit_logs table from scratch...');
      
      // Create table with all columns
      await query(`
        CREATE TABLE audit_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NULL,
          table_name VARCHAR(50) NULL,
          record_id INT NULL,
          action VARCHAR(20) NOT NULL,
          old_values JSON NULL,
          new_values JSON NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          description TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_table_name (table_name),
          INDEX idx_record_id (record_id),
          INDEX idx_action (action),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✓ Created audit_logs table with all columns');
    } else {
      console.log('   Table exists, checking for missing columns...\n');
      
      // Get existing columns
      const columns = await query(`
        SELECT COLUMN_NAME 
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'audit_logs'
      `);
      
      const existingColumns = columns.map(c => c.COLUMN_NAME.toLowerCase());
      console.log('   Existing columns:', existingColumns.join(', '));
      
      // Define all required columns
      const requiredColumns = [
        { name: 'user_id', type: 'INT', nullable: true },
        { name: 'table_name', type: 'VARCHAR(50)', nullable: true },
        { name: 'record_id', type: 'INT', nullable: true },
        { name: 'action', type: 'VARCHAR(20)', nullable: false, default: "'UPDATE'" },
        { name: 'old_values', type: 'JSON', nullable: true },
        { name: 'new_values', type: 'JSON', nullable: true },
        { name: 'ip_address', type: 'VARCHAR(45)', nullable: true },
        { name: 'user_agent', type: 'TEXT', nullable: true },
        { name: 'description', type: 'TEXT', nullable: true },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP' }
      ];
      
      // Add missing columns
      for (const col of requiredColumns) {
        if (!existingColumns.includes(col.name.toLowerCase())) {
          try {
            let sql = `ALTER TABLE audit_logs ADD COLUMN ${col.name} ${col.type}`;
            if (col.nullable === false && col.default) {
              sql += ` NOT NULL DEFAULT ${col.default}`;
            } else if (col.nullable) {
              sql += ` NULL`;
            }
            
            await query(sql);
            console.log(`   ✓ Added column: ${col.name}`);
          } catch (error) {
            console.log(`   ⚠ Error adding ${col.name}: ${error.message}`);
          }
        } else {
          console.log(`   ℹ Column ${col.name} already exists`);
        }
      }
      
      // Add indexes for performance
      console.log('\n   Adding indexes...');
      const indexes = [
        { name: 'idx_user_id', column: 'user_id' },
        { name: 'idx_table_name', column: 'table_name' },
        { name: 'idx_record_id', column: 'record_id' },
        { name: 'idx_action', column: 'action' },
        { name: 'idx_created_at', column: 'created_at' }
      ];
      
      for (const idx of indexes) {
        try {
          await query(`CREATE INDEX ${idx.name} ON audit_logs(${idx.column})`);
          console.log(`   ✓ Added index: ${idx.name}`);
        } catch (error) {
          if (error.message.includes('Duplicate')) {
            console.log(`   ℹ Index ${idx.name} already exists`);
          } else {
            console.log(`   ⚠ ${idx.name}: ${error.message}`);
          }
        }
      }
    }

    console.log('\n✅ Audit logs fix completed successfully!');
  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixAuditLogsFinal()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = fixAuditLogsFinal;
