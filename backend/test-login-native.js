async function testLogin() {
  const users = [
    { username: 'admin', password: 'password123' },
    { username: 'manager', password: 'password123' },
    { username: 'editor', password: 'password123' },
    { username: 'viewer', password: 'password123' }
  ];

  console.log('🔐 Testing login for sample credentials...\n');

  for (const user of users) {
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ ${user.username} - Login successful`);
        console.log(`   Role: ${data.data.user.role}`);
        console.log(`   Name: ${data.data.user.fullName}`);
        console.log(`   Token: ${data.data.accessToken.substring(0, 20)}...`);
      } else {
        console.log(`❌ ${user.username} - Login failed`);
        console.log(`   Error: ${data.message}`);
      }
    } catch (error) {
      console.log(`❌ ${user.username} - Login failed`);
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }
}

testLogin().catch(console.error);
