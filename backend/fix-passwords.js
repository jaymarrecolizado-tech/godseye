const mysql = require('mysql2/promise');

async function fixPasswords() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    database: 'project_tracking'
  });
  
  const newHash = '$2a$10$jjykEveNIDCR9T3DCFbTV.qQqc6wwQAhwAhgNwG/pHzSsXR4Co1ui';
  
  await connection.execute('UPDATE users SET password_hash = ?', [newHash]);
  console.log('✓ Passwords updated successfully');
  
  await connection.end();
}

fixPasswords().catch(e => console.error('Error:', e.message));
