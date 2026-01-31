const mysql = require('mysql2/promise');

async function fixUserRoles() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'project_tracking'
  });

  console.log('🔧 Fixing user roles...');

  const updates = [
    { username: 'admin', role: 'Admin' },
    { username: 'manager', role: 'Manager' },
    { username: 'editor', role: 'Editor' },
    { username: 'viewer', role: 'Viewer' }
  ];

  for (const update of updates) {
    await connection.execute(
      'UPDATE users SET role = ? WHERE username = ?',
      [update.role, update.username]
    );
    console.log(`  ✅ Updated '${update.username}' role to '${update.role}'`);
  }

  console.log('\n📊 Updated users:');
  const [users] = await connection.execute(
    `SELECT username, email, full_name, role, is_active 
     FROM users 
     WHERE username IN ('admin', 'manager', 'editor', 'viewer')
     ORDER BY username`
  );

  console.log('─'.repeat(80));
  for (const user of users) {
    console.log(`👤 ${user.username.padEnd(10)} | ${user.full_name.padEnd(20)} | ${user.role.padEnd(8)} | ${user.is_active ? '✓' : '✗'}`);
  }
  console.log('─'.repeat(80));

  await connection.end();
  console.log('\n🎉 User roles fixed!');
}

fixUserRoles().catch(console.error);
