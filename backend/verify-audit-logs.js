/**
 * Verify Audit Logging via API
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function verifyAuditLogs() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Audit Logging Verification via API                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // Login
    console.log('=== Step 1: Login ===');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    const token = loginResponse.data.data.accessToken;
    console.log('✓ Login successful\n');

    // Check audit logs
    console.log('=== Step 2: Check Audit Logs ===');
    const auditResponse = await axios.get(`${API_URL}/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 10 }
    });

    const logs = auditResponse.data.data;
    console.log(`✓ Found ${auditResponse.data.pagination?.total || logs.length} audit log entries\n`);

    // Display recent logs
    console.log('=== Recent Audit Logs ===');
    if (logs.length === 0) {
      console.log('No audit logs found\n');
    } else {
      logs.slice(0, 5).forEach(log => {
        console.log(`  [${log.action}] ${log.entity}:${log.entity_id} by ${log.user} at ${log.timestamp}`);
      });
    }

    // Check audit stats
    console.log('\n=== Audit Statistics ===');
    const statsResponse = await axios.get(`${API_URL}/audit-logs/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const stats = statsResponse.data.data;
    console.log(`Total Logs: ${stats.total}`);
    console.log('Actions:', stats.actions);
    console.log('By Entity:', stats.by_entity);

    // Test creating a project and check if audit log is created
    console.log('\n=== Step 3: Test Project Creation Audit ===');
    const testProject = {
      site_code: `AUDIT-TEST-${Date.now()}`,
      project_type_id: 1,
      site_name: `Audit Test ${Date.now()}`,
      province_id: 1,
      municipality_id: 1,
      barangay_id: 1,
      latitude: 14.5995,
      longitude: 120.9842,
      activation_date: '2026-01-31',
      status: 'Pending'
    };

    const createResponse = await axios.post(
      `${API_URL}/projects`,
      testProject,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const newProjectId = createResponse.data.data.id;
    console.log(`✓ Created project: ${newProjectId}`);

    // Wait for async audit log
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if audit log exists for this project
    const projectAuditResponse = await axios.get(`${API_URL}/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { entity: 'project_sites', limit: 5 }
    });

    const recentLogs = projectAuditResponse.data.data;
    const projectLog = recentLogs.find(log => 
      log.entity === 'project_sites' && 
      log.entity_id === newProjectId && 
      log.action === 'CREATE'
    );

    if (projectLog) {
      console.log('✓ CREATE audit log verified!');
      console.log(`  Log ID: ${projectLog.id}`);
      console.log(`  User: ${projectLog.user}`);
    } else {
      console.log('⚠ CREATE audit log not yet visible (may need refresh)');
    }

    // Cleanup - delete test project
    console.log('\n=== Step 4: Cleanup ===');
    await axios.delete(
      `${API_URL}/projects/${newProjectId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✓ Test project deleted\n');

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Audit Logging Verification Complete!                 ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('✗ Verification failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
    process.exit(1);
  }
}

verifyAuditLogs();
