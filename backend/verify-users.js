const mysql = require('mysql2/promise');

async function verifyUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'project_tracking'
  });

  const [users] = await connection.execute(
    'SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY id'
  );

  console.log('📊 Users in database:');
  console.log('─'.repeat(100));

  for (const user of users) {
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Full Name: ${user.full_name}`);
    console.log(`Role: ${user.role}`);
    console.log(`Active: ${user.is_active ? 'Yes' : 'No'}`);
    console.log(`Created: ${user.created_at}`);
    console.log('─'.repeat(100));
  }

  console.log(`\nTotal users: ${users.length}`);

  await connection.end();
}

verifyUsers().catch(console.error);
