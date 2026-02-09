/**
 * Fix Audit Logs Table Schema
 */

const { query } = require('./src/config/database');

async function fixAuditLogs() {
  console.log('🔧 Fixing audit_logs table...\n');

  try {
    // Add missing columns (ignore errors if they exist)
    const missingColumns = [
      { name: 'table_name', type: 'VARCHAR(50)' },
      { name: 'record_id', type: 'INT' },
      { name: 'old_values', type: 'JSON' },
      { name: 'new_values', type: 'JSON' }
    ];

    for (const col of missingColumns) {
      try {
        await query(`ALTER TABLE audit_logs ADD COLUMN ${col.name} ${col.type}`);
        console.log(`   ✓ Added column: ${col.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate')) {
          console.log(`   ℹ Column ${col.name} already exists`);
        } else {
          console.log(`   ⚠ ${col.name}: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Audit logs fix completed!');
  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
  } finally {
    process.exit(0);
  }
}

fixAuditLogs();
