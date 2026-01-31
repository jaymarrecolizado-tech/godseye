/**
 * Run Database Migration Script
 * Executes the notifications table migration
 */

const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('./src/config/database');

async function runMigration() {
  console.log('Running database migration...\n');

  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '002_add_notifications_table.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    // Extract just the CREATE TABLE statement (before the comment block at the end)
    const createTableMatch = migrationSql.match(/CREATE TABLE IF NOT EXISTS notifications \(/s);
    if (!createTableMatch) {
      throw new Error('Could not find CREATE TABLE statement in migration file');
    }

    // Parse out the CREATE TABLE part
    const lines = migrationSql.split('\n');
    let createTableSql = '';
    let inCreateTable = false;
    let parenCount = 0;

    for (const line of lines) {
      if (line.includes('CREATE TABLE IF NOT EXISTS notifications')) {
        inCreateTable = true;
      }

      if (inCreateTable) {
        createTableSql += line + '\n';
        // Count parentheses to find end of statement
        for (const char of line) {
          if (char === '(') parenCount++;
          if (char === ')') parenCount--;
        }
        // End of CREATE TABLE
        if (parenCount === 0 && line.trim().endsWith(';')) {
          break;
        }
      }
    }

    console.log('Creating notifications table...');
    console.log(createTableSql);

    // Execute the CREATE TABLE statement
    await query(createTableSql, []);

    console.log('\n✓ Migration completed successfully!');
    console.log('  - Notifications table created');

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    
    // Check if table already exists
    if (error.message.includes('already exists') || error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('\n  Note: Table may already exist');
      process.exit(0);
    }
    
    process.exit(1);
  }
}

// Run migration
runMigration();
