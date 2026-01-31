/**
 * Test script for PDF export functionality
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Test configuration
const API_HOST = 'localhost';
const API_PORT = 3001;
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || ''; // Add your auth token here if needed

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = [];
      
      res.on('data', (chunk) => {
        data.push(chunk);
      });
      
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: buffer
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

// Test PDF export endpoints
async function testPDFExports() {
  console.log('==============================================');
  console.log('Testing PDF Export Endpoints');
  console.log('==============================================\n');

  const endpoints = [
    { name: 'Summary Report', path: '/api/reports/export/pdf/summary' },
    { name: 'Status Report', path: '/api/reports/export/pdf/status' },
    { name: 'Location Report', path: '/api/reports/export/pdf/location' },
    { name: 'Projects Report', path: '/api/reports/export/pdf/projects' }
  ];

  const testResults = [];

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name}...`);
    console.log(`  Endpoint: ${endpoint.path}`);
    
    try {
      const response = await makeRequest(endpoint.path);
      
      if (response.statusCode === 200) {
        // Check if response is PDF
        const contentType = response.headers['content-type'];
        const isPDF = contentType === 'application/pdf';
        
        if (isPDF) {
          // Save PDF for verification
          const filename = `test-${endpoint.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
          const filepath = path.join(__dirname, 'uploads', filename);
          fs.writeFileSync(filepath, response.data);
          
          console.log(`  ✅ SUCCESS - PDF generated (${response.data.length} bytes)`);
          console.log(`  📄 Saved to: ${filepath}\n`);
          testResults.push({ name: endpoint.name, status: 'SUCCESS', size: response.data.length });
        } else {
          console.log(`  ⚠️ WARNING - Response is not PDF (${contentType})`);
          console.log(`  Response preview: ${response.data.toString().substring(0, 200)}...\n`);
          testResults.push({ name: endpoint.name, status: 'NOT_PDF', contentType });
        }
      } else if (response.statusCode === 401) {
        console.log(`  🔒 AUTHENTICATION REQUIRED - Please provide a valid auth token\n`);
        testResults.push({ name: endpoint.name, status: 'AUTH_REQUIRED' });
      } else if (response.statusCode === 404) {
        console.log(`  📭 NO DATA - No projects found for filters\n`);
        testResults.push({ name: endpoint.name, status: 'NO_DATA' });
      } else {
        console.log(`  ❌ ERROR - Status ${response.statusCode}`);
        console.log(`  Response: ${response.data.toString().substring(0, 200)}...\n`);
        testResults.push({ name: endpoint.name, status: 'ERROR', code: response.statusCode });
      }
    } catch (error) {
      console.log(`  ❌ FAILED - ${error.message}\n`);
      testResults.push({ name: endpoint.name, status: 'FAILED', error: error.message });
    }
  }

  // Summary
  console.log('==============================================');
  console.log('Test Summary');
  console.log('==============================================');
  
  const successCount = testResults.filter(r => r.status === 'SUCCESS').length;
  console.log(`\nTotal Tests: ${testResults.length}`);
  console.log(`Passed: ${successCount}`);
  console.log(`Failed: ${testResults.length - successCount}`);
  
  console.log('\nDetailed Results:');
  testResults.forEach(result => {
    const icon = result.status === 'SUCCESS' ? '✅' : 
                 result.status === 'AUTH_REQUIRED' ? '🔒' : '❌';
    console.log(`  ${icon} ${result.name}: ${result.status}`);
  });
  
  return testResults;
}

// Run tests
console.log('PDF Export Test Script\n');
console.log('Note: This script tests the PDF export endpoints.');
console.log('If authentication is required, you may see 401 errors.\n');

testPDFExports()
  .then(results => {
    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    process.exit(successCount === results.length ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
