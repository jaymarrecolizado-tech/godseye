const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function migrateCredentials() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'project_tracking'
  });

  console.log('🔌 Connected to database');

  // Password for all users
  const password = 'password123';
  const passwordHash = bcrypt.hashSync(password, 10);

  console.log('🔐 Hashed password:', passwordHash);

  const users = [
    {
      username: 'admin',
      email: 'admin@example.com',
      full_name: 'System Administrator',
      role: 'Admin'
    },
    {
      username: 'manager',
      email: 'manager@example.com',
      full_name: 'Project Manager',
      role: 'Manager'
    },
    {
      username: 'editor',
      email: 'editor@example.com',
      full_name: 'Content Editor',
      role: 'Editor'
    },
    {
      username: 'viewer',
      email: 'viewer@example.com',
      full_name: 'View Only User',
      role: 'Viewer'
    }
  ];

  console.log('\n👤 Migrating sample credentials...');

  for (const user of users) {
    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [user.username]
    );

    if (existing.length > 0) {
      console.log(`  ⏭️  User '${user.username}' already exists, updating password...`);

      // Update the user
      await connection.execute(
        `UPDATE users SET 
          email = ?, 
          password_hash = ?, 
          full_name = ?, 
          role = ?, 
          is_active = TRUE,
          updated_at = CURRENT_TIMESTAMP
        WHERE username = ?`,
        [user.email, passwordHash, user.full_name, user.role, user.username]
      );

      console.log(`  ✅ Updated '${user.username}'`);
    } else {
      // Insert new user
      console.log(`  ➕ Creating user '${user.username}'...`);

      await connection.execute(
        `INSERT INTO users (username, email, password_hash, full_name, role, is_active)
        VALUES (?, ?, ?, ?, ?, TRUE)`,
        [user.username, user.email, passwordHash, user.full_name, user.role]
      );

      console.log(`  ✅ Created '${user.username}'`);
    }
  }

  // Verify users
  const [allUsers] = await connection.execute(
    'SELECT username, email, full_name, role, is_active, created_at FROM users ORDER BY id'
  );

  console.log('\n📊 Current users in database:');
  console.log('─'.repeat(80));
  console.log(sprintf('%-10s %-30s %-15s %-8s %s',
    'Username', 'Email', 'Full Name', 'Role', 'Active'));
  console.log('─'.repeat(80));

  for (const user of allUsers) {
    console.log(sprintf('%-10s %-30s %-15s %-8s %s',
      user.username,
      user.email,
      user.full_name,
      user.role,
      user.is_active ? '✓' : '✗'
    ));
  }

  await connection.end();

  console.log('\n🎉 Migration complete!');
  console.log('\n📝 Sample Credentials:');
  console.log('─'.repeat(80));
  users.forEach(user => {
    console.log(`  ${user.username} / ${password}`);
  });
  console.log('─'.repeat(80));
}

// Helper function for formatting
function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%s/g, () => args[i++]);
}

migrateCredentials().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
