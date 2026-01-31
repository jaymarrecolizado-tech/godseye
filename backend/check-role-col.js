const mysql = require('mysql2/promise');

async function checkTableStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'project_tracking'
  });

  const [columns] = await connection.execute(
    "SHOW COLUMNS FROM users WHERE Field = 'role'"
  );

  console.log('📋 Role column structure:');
  console.log('─'.repeat(80));
  columns.forEach(col => {
    console.log(`Field: ${col.Field}`);
    console.log(`Type: ${col.Type}`);
    console.log(`Null: ${col.Null}`);
    console.log(`Key: ${col.Key}`);
    console.log(`Default: ${col.Default}`);
    console.log(`Extra: ${col.Extra}`);
  });
  console.log('─'.repeat(80));

  await connection.end();
}

checkTableStructure().catch(console.error);
