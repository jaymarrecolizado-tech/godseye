/**
 * Test script for Audit Logger Middleware
 * Tests CREATE, UPDATE, and DELETE audit logging
 */

const axios = require('axios');
const { query } = require('./src/config/database');

const API_URL = 'http://localhost:3001/api';

// Test credentials
const TEST_USER = {
  username: 'admin',
  password: 'password123'
};

let authToken = null;
let testProjectId = null;

// Helper function to delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Login to get auth token
async function login() {
  console.log('\n=== Testing Login ===');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    authToken = response.data.data.accessToken || response.data.data.token;
    console.log('✓ Login successful');
    console.log(`  Token: ${authToken.substring(0, 30)}...`);
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test CREATE audit logging
async function testCreateAudit() {
  console.log('\n=== Testing CREATE Audit Logging ===');
  try {
    const newProject = {
      site_code: `TEST-${Date.now()}`,
      project_type_id: 1,
      site_name: `Audit Test Project ${Date.now()}`,
      province_id: 1,
      municipality_id: 1,
      barangay_id: 1,
      latitude: 14.5995,
      longitude: 120.9842,
      activation_date: '2026-01-31',
      status: 'Pending',
      remarks: 'Test project for audit logging'
    };

    const response = await axios.post(
      `${API_URL}/projects`,
      newProject,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (response.data.success) {
      testProjectId = response.data.data.id;
      console.log('✓ Project created successfully');
      console.log(`  Project ID: ${testProjectId}`);
      
      // Wait a moment for async audit log
      await delay(500);
      
      // Verify audit log was created
      const auditLogs = await query(
        'SELECT * FROM audit_logs WHERE table_name = ? AND record_id = ? AND action = ? ORDER BY created_at DESC',
        ['project_sites', testProjectId, 'CREATE']
      );
      
      if (auditLogs.length > 0) {
        console.log('✓ CREATE audit log found');
        console.log(`  Audit Log ID: ${auditLogs[0].id}`);
        console.log(`  User ID: ${auditLogs[0].user_id}`);
        console.log(`  Action: ${auditLogs[0].action}`);
        console.log(`  New Values: ${auditLogs[0].new_values.substring(0, 100)}...`);
        return true;
      } else {
        console.error('✗ CREATE audit log NOT found');
        return false;
      }
    } else {
      console.error('✗ Project creation failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('✗ CREATE test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test UPDATE audit logging
async function testUpdateAudit() {
  console.log('\n=== Testing UPDATE Audit Logging ===');
  try {
    if (!testProjectId) {
      console.error('✗ No test project ID available');
      return false;
    }

    const updateData = {
      site_name: `Updated Audit Test Project ${Date.now()}`,
      status: 'In Progress',
      remarks: 'Updated remarks for audit test'
    };

    const response = await axios.put(
      `${API_URL}/projects/${testProjectId}`,
      updateData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (response.data.success) {
      console.log('✓ Project updated successfully');
      
      // Wait a moment for async audit log
      await delay(500);
      
      // Verify audit log was created
      const auditLogs = await query(
        'SELECT * FROM audit_logs WHERE table_name = ? AND record_id = ? AND action = ? ORDER BY created_at DESC',
        ['project_sites', testProjectId, 'UPDATE']
      );
      
      if (auditLogs.length > 0) {
        console.log('✓ UPDATE audit log found');
        console.log(`  Audit Log ID: ${auditLogs[0].id}`);
        console.log(`  User ID: ${auditLogs[0].user_id}`);
        console.log(`  Action: ${auditLogs[0].action}`);
        console.log(`  Old Values present: ${auditLogs[0].old_values ? 'Yes' : 'No'}`);
        console.log(`  New Values present: ${auditLogs[0].new_values ? 'Yes' : 'No'}`);
        return true;
      } else {
        console.error('✗ UPDATE audit log NOT found');
        return false;
      }
    } else {
      console.error('✗ Project update failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('✗ UPDATE test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test DELETE audit logging
async function testDeleteAudit() {
  console.log('\n=== Testing DELETE Audit Logging ===');
  try {
    if (!testProjectId) {
      console.error('✗ No test project ID available');
      return false;
    }

    const response = await axios.delete(
      `${API_URL}/projects/${testProjectId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (response.data.success) {
      console.log('✓ Project deleted successfully');
      
      // Wait a moment for async audit log
      await delay(500);
      
      // Verify audit log was created
      const auditLogs = await query(
        'SELECT * FROM audit_logs WHERE table_name = ? AND record_id = ? AND action = ? ORDER BY created_at DESC',
        ['project_sites', testProjectId, 'DELETE']
      );
      
      if (auditLogs.length > 0) {
        console.log('✓ DELETE audit log found');
        console.log(`  Audit Log ID: ${auditLogs[0].id}`);
        console.log(`  User ID: ${auditLogs[0].user_id}`);
        console.log(`  Action: ${auditLogs[0].action}`);
        console.log(`  Old Values present: ${auditLogs[0].old_values ? 'Yes' : 'No'}`);
        return true;
      } else {
        console.error('✗ DELETE audit log NOT found');
        return false;
      }
    } else {
      console.error('✗ Project deletion failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('✗ DELETE test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Cleanup test data from audit logs
async function cleanup() {
  console.log('\n=== Cleaning Up Test Data ===');
  try {
    if (testProjectId) {
      // Delete all audit logs for the test project
      await query('DELETE FROM audit_logs WHERE table_name = ? AND record_id = ?', 
        ['project_sites', testProjectId]);
      console.log('✓ Audit logs cleaned up');
    }
  } catch (error) {
    console.error('✗ Cleanup failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Audit Logger Middleware Test Suite                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  try {
    // Login first
    const loggedIn = await login();
    if (!loggedIn) {
      console.log('\n✗ Tests aborted - Login failed');
      process.exit(1);
    }

    // Run tests
    const results = {
      create: await testCreateAudit(),
      update: await testUpdateAudit(),
      delete: await testDeleteAudit()
    };

    // Summary
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     Test Summary                                         ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`CREATE Audit Logging: ${results.create ? '✓ PASSED' : '✗ FAILED'}`);
    console.log(`UPDATE Audit Logging: ${results.update ? '✓ PASSED' : '✗ FAILED'}`);
    console.log(`DELETE Audit Logging: ${results.delete ? '✓ PASSED' : '✗ FAILED'}`);
    
    const allPassed = results.create && results.update && results.delete;
    console.log(`\nOverall: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);

    // Cleanup
    await cleanup();

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n✗ Test suite failed:', error.message);
    await cleanup();
    process.exit(1);
  }
}

// Run tests
runTests();
