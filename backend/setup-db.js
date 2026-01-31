const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function setupDatabase() {
  const connectionConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: ''
  };

  console.log('🔌 Connecting to MySQL...');

  try {
    // Connect without database first to create it
    const connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to MySQL server');

    // Create database
    console.log('📦 Creating database project_tracking...');
    await connection.execute(`
      CREATE DATABASE IF NOT EXISTS project_tracking
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ Database created');

    // Close connection and reconnect with database
    await connection.end();

    const dbConnection = await mysql.createConnection({
      ...connectionConfig,
      database: 'project_tracking'
    });
    console.log('✅ Connected to project_tracking database');

    // Read and execute schema
    console.log('📋 Running schema...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    // Split schema by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const statement of statements) {
      try {
        await dbConnection.execute(statement);
      } catch (err) {
        // Ignore errors for statements that might fail (like DROP if table doesn't exist)
        if (!err.message.includes('doesn\'t exist')) {
          console.warn(`⚠️  Warning: ${err.message}`);
        }
      }
    }
    console.log('✅ Schema executed');

    // Run seed files
    console.log('🌱 Running seed data...');
    const seedsDir = path.join(__dirname, '../database/seeds');
    const seedFiles = await fs.readdir(seedsDir);
    const sqlFiles = seedFiles.filter(f => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      console.log(`  📄 ${file}...`);
      const seedPath = path.join(seedsDir, file);
      const seedContent = await fs.readFile(seedPath, 'utf8');

      const seedStatements = seedContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      for (const statement of seedStatements) {
        try {
          await dbConnection.execute(statement);
        } catch (err) {
          if (!err.message.includes('Duplicate entry') && !err.message.includes('doesn\'t exist')) {
            console.warn(`    ⚠️  Warning: ${err.message}`);
          }
        }
      }
    }
    console.log('✅ Seed data completed');

    // Verify setup
    const [tables] = await dbConnection.execute('SHOW TABLES');
    console.log(`\n📊 Database setup complete! Created ${tables.length} tables:`);
    tables.forEach(row => {
      console.log(`   ✓ ${Object.values(row)[0]}`);
    });

    await dbConnection.end();
    console.log('\n🎉 Database setup successful!\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  }
}

setupDatabase();
