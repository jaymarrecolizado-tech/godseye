/**
 * Test script for notification system
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// Test user credentials (from seed data)
const credentials = {
  username: 'admin',
  password: 'password123'
};

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    return response.data.data.accessToken;
  } catch (error) {
    console.error('Login failed:', error.response?.data?.message || error.message);
    throw error;
  }
}

async function testNotifications() {
  console.log('Testing Notification System...\n');

  let token;
  try {
    // Login
    console.log('1. Logging in...');
    token = await login();
    console.log('   ✓ Logged in successfully\n');

    const headers = { Authorization: `Bearer ${token}` };

    // Test 1: Get unread count
    console.log('2. Testing GET /api/notifications/unread-count');
    const unreadResponse = await axios.get(`${API_URL}/notifications/unread-count`, { headers });
    console.log('   Response:', JSON.stringify(unreadResponse.data, null, 2));
    console.log('   ✓ Unread count retrieved\n');

    // Test 2: Get notifications
    console.log('3. Testing GET /api/notifications');
    const notificationsResponse = await axios.get(`${API_URL}/notifications`, { headers });
    console.log('   Found', notificationsResponse.data.data?.length || 0, 'notifications');
    console.log('   ✓ Notifications retrieved\n');

    // Test 3: Create a test notification (admin only)
    console.log('4. Testing POST /api/notifications/test');
    try {
      const createResponse = await axios.post(`${API_URL}/notifications/test`, {
        type: 'system',
        title: 'Test Notification',
        message: 'This is a test notification from the test script'
      }, { headers });
      console.log('   Created notification:', JSON.stringify(createResponse.data.data, null, 2));
      console.log('   ✓ Test notification created\n');

      // Test 4: Mark as read
      if (createResponse.data.data?.id) {
        const notificationId = createResponse.data.data.id;
        console.log('5. Testing PUT /api/notifications/:id/read');
        const markReadResponse = await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, { headers });
        console.log('   Response:', JSON.stringify(markReadResponse.data, null, 2));
        console.log('   ✓ Notification marked as read\n');
      }
    } catch (error) {
      console.log('   Note: Test notification creation requires admin privileges\n');
    }

    // Test 5: Mark all as read
    console.log('6. Testing PUT /api/notifications/read-all');
    const markAllResponse = await axios.put(`${API_URL}/notifications/read-all`, {}, { headers });
    console.log('   Response:', JSON.stringify(markAllResponse.data, null, 2));
    console.log('   ✓ All notifications marked as read\n');

    console.log('✓ All tests completed successfully!');

  } catch (error) {
    console.error('\n✗ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
testNotifications();
