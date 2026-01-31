/**
 * Import API Test Script
 * Tests all import endpoints using Node.js native fetch
 */
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3001/api';

// Test credentials - from database/seeds/test_users.sql
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

let authToken = null;

// Helper to make requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    ...options.headers
  };
  
  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

// Login to get token
async function login() {
  console.log('\n=== Testing Login ===');
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_CREDENTIALS)
  });
  
  console.log('Status:', response.status);
  
  if (response.ok && response.data.data?.accessToken) {
    authToken = response.data.data.accessToken;
    console.log('✓ Login successful');
    console.log('Token:', authToken.substring(0, 30) + '...');
    return true;
  } else {
    console.log('✗ Login failed:', JSON.stringify(response.data));
    return false;
  }
}

// Test list imports endpoint
async function testListImports() {
  console.log('\n=== Testing GET /api/import (List Imports) ===');
  const response = await apiRequest('/import');
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.ok) {
    console.log('✓ List imports endpoint works');
    return true;
  } else {
    console.log('✗ List imports endpoint failed');
    return false;
  }
}

// Test CSV upload endpoint
async function testUploadCSV() {
  console.log('\n=== Testing POST /api/import/csv (Upload CSV) ===');
  
  const csvPath = path.join(__dirname, 'test-import.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('✗ Test CSV file not found:', csvPath);
    return null;
  }
  
  try {
    // Read file as buffer
    const fileBuffer = fs.readFileSync(csvPath);
    
    // Create FormData using native Node.js FormData
    const formData = new FormData();
    
    // Create a Blob from the buffer
    const blob = new Blob([fileBuffer], { type: 'text/csv' });
    formData.append('file', blob, 'test-import.csv');
    formData.append('skipDuplicates', 'true');
    formData.append('updateExisting', 'false');
    
    const response = await fetch(`${API_URL}/import/csv`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✓ Upload CSV endpoint works');
      return data.data?.importId;
    } else {
      console.log('✗ Upload CSV endpoint failed:', data.message);
      return null;
    }
  } catch (error) {
    console.log('✗ Upload CSV error:', error.message);
    return null;
  }
}

// Test import status endpoint
async function testImportStatus(importId) {
  console.log(`\n=== Testing GET /api/import/${importId}/status ===`);
  const response = await apiRequest(`/import/${importId}/status`);
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.ok) {
    console.log('✓ Import status endpoint works');
    return true;
  } else {
    console.log('✗ Import status endpoint failed');
    return false;
  }
}

// Test download error report endpoint
async function testDownloadErrorReport(importId) {
  console.log(`\n=== Testing GET /api/import/${importId}/download (Error Report) ===`);
  const response = await apiRequest(`/import/${importId}/download`);
  
  console.log('Status:', response.status);
  
  if (response.status === 400) {
    console.log('Expected: Import still processing or no errors');
    console.log('Response:', response.data);
    return true;
  } else if (response.ok) {
    console.log('✓ Download error report endpoint works');
    return true;
  } else {
    console.log('✗ Download error report endpoint failed');
    return false;
  }
}

// Test template download endpoint (expected to fail if not implemented)
async function testTemplateDownload() {
  console.log('\n=== Testing GET /api/import/template (Template Download) ===');
  const response = await apiRequest('/import/template');
  
  console.log('Status:', response.status);
  
  if (response.status === 404) {
    console.log('✗ Template download endpoint NOT IMPLEMENTED');
    return false;
  } else if (response.ok) {
    console.log('✓ Template download endpoint works');
    return true;
  } else {
    console.log('Response:', response.data);
    return false;
  }
}

// Test validate endpoint (expected to fail if not implemented)
async function testValidateCSV() {
  console.log('\n=== Testing POST /api/import/validate (Validate CSV) ===');
  
  const csvPath = path.join(__dirname, 'test-import.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('✗ Test CSV file not found');
    return false;
  }
  
  try {
    const fileBuffer = fs.readFileSync(csvPath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'text/csv' });
    formData.append('file', blob, 'test-import.csv');
    
    const response = await fetch(`${API_URL}/import/validate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    
    if (response.status === 404) {
      console.log('✗ Validate endpoint NOT IMPLEMENTED');
      return false;
    } else if (response.ok) {
      console.log('✓ Validate endpoint works');
      console.log('Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log('Response:', data);
      return false;
    }
  } catch (error) {
    console.log('✗ Validate error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('==============================================');
  console.log('      IMPORT API ENDPOINT TESTS');
  console.log('==============================================');
  
  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\nCannot continue without authentication');
    process.exit(1);
  }
  
  // Run all tests
  const results = {
    listImports: await testListImports(),
    templateDownload: await testTemplateDownload(),
    validateCSV: await testValidateCSV(),
  };
  
  // Test upload
  const importId = await testUploadCSV();
  results.uploadCSV = !!importId;
  
  // Test status if upload succeeded
  if (importId) {
    results.importStatus = await testImportStatus(importId);
    results.downloadErrorReport = await testDownloadErrorReport(importId);
  }
  
  // Print summary
  console.log('\n==============================================');
  console.log('              TEST SUMMARY');
  console.log('==============================================');
  
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(results)) {
    const status = result ? '✓ PASS' : result === false ? '✗ FAIL' : '○ SKIP';
    console.log(`${status}: ${test}`);
    if (result) passed++;
    if (result === false) failed++;
  }
  
  console.log('----------------------------------------------');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('==============================================');
  
  // Report missing features
  if (!results.templateDownload) {
    console.log('\n⚠️ MISSING FEATURE: GET /api/import/template endpoint');
  }
  if (!results.validateCSV) {
    console.log('⚠️ MISSING FEATURE: POST /api/import/validate endpoint');
  }
}

runTests().catch(console.error);
