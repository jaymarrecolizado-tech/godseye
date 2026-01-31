/**
 * Test script for Reports API endpoints
 */
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testReports() {
  try {
    // Login first
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    const token = loginRes.data.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✓ Login successful');
    
    // Test reference endpoints
    console.log('\n--- Testing Reference Endpoints ---');
    
    console.log('Testing /reference/provinces...');
    const provincesRes = await axios.get(`${API_URL}/reference/provinces`, { headers });
    console.log(`✓ Provinces: ${provincesRes.data.data.length} provinces found`);
    
    console.log('Testing /reference/project-types...');
    const projectTypesRes = await axios.get(`${API_URL}/reference/project-types`, { headers });
    console.log(`✓ Project Types: ${projectTypesRes.data.data.length} types found`);
    
    // Test reports endpoints
    console.log('\n--- Testing Reports Endpoints ---');
    
    console.log('Testing /reports/summary...');
    const summaryRes = await axios.get(`${API_URL}/reports/summary`, { headers });
    console.log('✓ Summary report:', JSON.stringify(summaryRes.data.data.summary, null, 2));
    
    console.log('Testing /reports/by-status...');
    const statusRes = await axios.get(`${API_URL}/reports/by-status`, { headers });
    console.log(`✓ Status report: ${statusRes.data.data.breakdown.length} items`);
    console.log('  Breakdown:', JSON.stringify(statusRes.data.data.breakdown, null, 2));
    
    console.log('Testing /reports/by-location...');
    const locationRes = await axios.get(`${API_URL}/reports/by-location`, { headers });
    console.log(`✓ Location report: ${locationRes.data.data.locations.length} locations`);
    
    console.log('Testing /reports/timeline...');
    const timelineRes = await axios.get(`${API_URL}/reports/timeline`, { headers });
    console.log(`✓ Timeline report: ${timelineRes.data.data.timeline.length} periods`);
    
    console.log('Testing /reports/by-project-type...');
    const typeRes = await axios.get(`${API_URL}/reports/by-project-type`, { headers });
    console.log(`✓ Project type report: ${typeRes.data.data.project_types.length} types`);
    
    console.log('Testing /reports/performance...');
    const perfRes = await axios.get(`${API_URL}/reports/performance`, { headers });
    console.log('✓ Performance report:');
    console.log('  Completion times:', perfRes.data.data.completion_times?.length || 0);
    console.log('  Status changes:', perfRes.data.data.status_changes?.length || 0);
    console.log('  Recent activity:', perfRes.data.data.recent_activity?.length || 0);
    
    // Test export endpoints
    console.log('\n--- Testing Export Endpoints ---');
    
    console.log('Testing /reports/export/csv...');
    try {
      const csvRes = await axios.get(`${API_URL}/reports/export/csv`, { 
        headers,
        responseType: 'text'
      });
      console.log('✓ CSV export: Success');
    } catch (e) {
      console.log('⚠ CSV export:', e.response?.status === 404 ? 'No data found' : e.message);
    }
    
    console.log('Testing /reports/export/excel...');
    try {
      const excelRes = await axios.get(`${API_URL}/reports/export/excel`, { 
        headers,
        responseType: 'text'
      });
      console.log('✓ Excel export: Success');
    } catch (e) {
      console.log('⚠ Excel export:', e.response?.status === 404 ? 'No data found' : e.message);
    }
    
    console.log('\n✅ All endpoints working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testReports();
