const mysql = require('mysql2/promise');

async function updateEnum() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'project_tracking'
  });

  console.log('🔧 Updating role ENUM values to match schema...');

  // First, temporarily change all roles to 'viewer' (valid in both old and new ENUM)
  await connection.execute("UPDATE users SET role = 'viewer'");

  // Update the ENUM definition
  await connection.execute(
    "ALTER TABLE users MODIFY COLUMN role ENUM('Admin', 'Manager', 'Editor', 'Viewer') DEFAULT 'Viewer'"
  );

  console.log('✅ ENUM updated successfully');

  // Now update user roles to match login page
  const updates = [
    { username: 'admin', role: 'Admin' },
    { username: 'manager', role: 'Manager' },
    { username: 'editor', role: 'Editor' },
    { username: 'viewer', role: 'Viewer' }
  ];

  console.log('\n👤 Updating user roles...');
  for (const update of updates) {
    await connection.execute(
      'UPDATE users SET role = ? WHERE username = ?',
      [update.role, update.username]
    );
    console.log(`  ✅ Updated '${update.username}' to '${update.role}'`);
  }

  // Verify
  const [users] = await connection.execute(
    "SELECT username, role FROM users WHERE username IN ('admin', 'manager', 'editor', 'viewer') ORDER BY username"
  );

  console.log('\n📊 Current user roles:');
  console.log('─'.repeat(40));
  users.forEach(user => {
    console.log(`  ${user.username.padEnd(10)} → ${user.role}`);
  });
  console.log('─'.repeat(40));

  await connection.end();
  console.log('\n🎉 Migration complete!');
}

updateEnum().catch(console.error);
