const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'project_tracking'
  });

  const [tables] = await connection.query('SHOW TABLES');
  console.log('Tables in database:');
  tables.forEach(t => console.log('  -', Object.values(t)[0]));
  
  await connection.end();
}

checkTables().catch(console.error);
