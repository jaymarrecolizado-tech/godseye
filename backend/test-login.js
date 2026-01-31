const axios = require('axios');

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
      const response = await axios.post('http://localhost:3001/api/auth/login', user);

      console.log(`✅ ${user.username} - Login successful`);
      console.log(`   Role: ${response.data.data.user.role}`);
      console.log(`   Name: ${response.data.data.user.fullName}`);
      console.log(`   Token: ${response.data.data.accessToken.substring(0, 20)}...`);
    } catch (error) {
      console.log(`❌ ${user.username} - Login failed`);
      if (error.response) {
        console.log(`   Error: ${error.response.data.message}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
    console.log('');
  }
}

testLogin().catch(console.error);
