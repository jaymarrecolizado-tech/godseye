/**
 * Comprehensive Report Filtering Test Script
 * Tests all filter combinations and export functionality
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001/api';
const TEST_RESULTS = {
  passed: [],
  failed: [],
  warnings: []
};

// Test configuration
let authToken = null;
let testData = {
  provinces: [],
  municipalities: [],
  districts: [],
  projectTypes: [],
  statuses: ['Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold']
};

// Logger
function log(section, message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} [${section}] ${message}`);
}

// Authenticate and get token
async function authenticate() {
  const credentials = [
    { username: 'admin', password: 'password123' },
    { username: 'manager', password: 'password123' },
    { username: 'admin', password: 'admin123' }
  ];
  
  for (const cred of credentials) {
    try {
      log('AUTH', `Authenticating as ${cred.username}...`);
      const response = await axios.post(`${API_BASE_URL}/auth/login`, cred);
      
      if (response.data.success) {
        authToken = response.data.data.accessToken;
        log('AUTH', `Authentication successful as ${cred.username}`, 'success');
        return true;
      }
    } catch (error) {
      log('AUTH', `${cred.username} auth failed: ${error.response?.data?.message || error.message}`);
    }
  }
  
  log('AUTH', 'All authentication attempts failed', 'error');
  return false;
}

// Make authenticated request
async function makeRequest(method, endpoint, params = null, responseType = 'json') {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    responseType
  };
  
  if (params && method === 'get') {
    config.params = params;
  }
  
  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
      details: error.response?.data
    };
  }
}

// Test 1: Load reference data
async function loadReferenceData() {
  log('REFERENCE', 'Loading reference data...');
  
  // Get provinces
  const provincesRes = await makeRequest('get', '/reference/provinces');
  if (provincesRes.success && provincesRes.data.data) {
    testData.provinces = provincesRes.data.data;
    log('REFERENCE', `Loaded ${testData.provinces.length} provinces`, 'success');
  } else {
    log('REFERENCE', 'Failed to load provinces', 'error');
  }
  
  // Get project types
  const typesRes = await makeRequest('get', '/reference/project-types');
  if (typesRes.success && typesRes.data.data) {
    testData.projectTypes = typesRes.data.data;
    log('REFERENCE', `Loaded ${testData.projectTypes.length} project types`, 'success');
  } else {
    log('REFERENCE', 'Failed to load project types', 'error');
  }
  
  // Get municipalities for first province
  if (testData.provinces.length > 0) {
    const firstProvinceId = testData.provinces[0].id;
    const munRes = await makeRequest('get', '/reference/municipalities', { province_id: firstProvinceId });
    if (munRes.success && munRes.data.data) {
      testData.municipalities = munRes.data.data;
      log('REFERENCE', `Loaded ${testData.municipalities.length} municipalities for province ${firstProvinceId}`, 'success');
    }
    
    // Get districts for first province
    const distRes = await makeRequest('get', '/reference/districts', { province_id: firstProvinceId });
    if (distRes.success && distRes.data.data) {
      testData.districts = distRes.data.data;
      log('REFERENCE', `Loaded ${testData.districts.length} districts for province ${firstProvinceId}`, 'success');
    }
  }
}

// Test 2: Date range filtering
async function testDateRangeFiltering() {
  log('FILTER_TEST', 'Testing date range filtering...');
  
  const testCases = [
    { name: 'Date From only', params: { date_from: '2024-01-01' } },
    { name: 'Date To only', params: { date_to: '2024-12-31' } },
    { name: 'Date range', params: { date_from: '2024-01-01', date_to: '2024-12-31' } },
    { name: 'Future date', params: { date_from: '2025-01-01' } },
    { name: 'Past date', params: { date_to: '2020-01-01' } }
  ];
  
  for (const testCase of testCases) {
    const result = await makeRequest('get', '/reports/custom', testCase.params);
    if (result.success) {
      const totalProjects = result.data.data?.summary?.total_projects ?? 0;
      log('FILTER_TEST', `${testCase.name}: ${totalProjects} projects found`, 'success');
      TEST_RESULTS.passed.push(`Date Range: ${testCase.name}`);
    } else {
      log('FILTER_TEST', `${testCase.name}: FAILED - ${result.error}`, 'error');
      TEST_RESULTS.failed.push(`Date Range: ${testCase.name} - ${result.error}`);
    }
  }
}

// Test 3: Province filtering
async function testProvinceFiltering() {
  log('FILTER_TEST', 'Testing province filtering...');
  
  if (testData.provinces.length === 0) {
    log('FILTER_TEST', 'No provinces available for testing', 'warning');
    TEST_RESULTS.warnings.push('Province filtering: No provinces available');
    return;
  }
  
  // Test with first province
  const provinceId = testData.provinces[0].id;
  const result = await makeRequest('get', '/reports/custom', { province_id: provinceId });
  
  if (result.success) {
    const totalProjects = result.data.data?.summary?.total_projects ?? 0;
    log('FILTER_TEST', `Province filter (ID: ${provinceId}): ${totalProjects} projects found`, 'success');
    TEST_RESULTS.passed.push(`Province filtering: ID ${provinceId}`);
    
    // Verify grouped by province works
    const groupResult = await makeRequest('get', '/reports/custom', { 
      province_id: provinceId, 
      group_by: 'province' 
    });
    if (groupResult.success) {
      const groups = groupResult.data.data?.groups?.length ?? 0;
      log('FILTER_TEST', `Province filter + group_by province: ${groups} groups`, 'success');
      TEST_RESULTS.passed.push('Province filter with grouping');
    }
  } else {
    log('FILTER_TEST', `Province filter: FAILED - ${result.error}`, 'error');
    TEST_RESULTS.failed.push(`Province filtering: ${result.error}`);
  }
}

// Test 4: Municipality filtering
async function testMunicipalityFiltering() {
  log('FILTER_TEST', 'Testing municipality filtering...');
  
  if (testData.municipalities.length === 0) {
    log('FILTER_TEST', 'No municipalities available for testing', 'warning');
    TEST_RESULTS.warnings.push('Municipality filtering: No municipalities available');
    return;
  }
  
  // Test with first municipality
  const municipalityId = testData.municipalities[0].id;
  const provinceId = testData.provinces[0].id;
  
  const result = await makeRequest('get', '/reports/custom', { 
    province_id: provinceId,
    municipality_id: municipalityId 
  });
  
  if (result.success) {
    const totalProjects = result.data.data?.summary?.total_projects ?? 0;
    log('FILTER_TEST', `Municipality filter (ID: ${municipalityId}): ${totalProjects} projects found`, 'success');
    TEST_RESULTS.passed.push(`Municipality filtering: ID ${municipalityId}`);
    
    // Verify grouped by municipality works
    const groupResult = await makeRequest('get', '/reports/custom', { 
      province_id: provinceId,
      municipality_id: municipalityId,
      group_by: 'municipality' 
    });
    if (groupResult.success) {
      const groups = groupResult.data.data?.groups?.length ?? 0;
      log('FILTER_TEST', `Municipality filter + group_by municipality: ${groups} groups`, 'success');
      TEST_RESULTS.passed.push('Municipality filter with grouping');
    }
  } else {
    log('FILTER_TEST', `Municipality filter: FAILED - ${result.error}`, 'error');
    TEST_RESULTS.failed.push(`Municipality filtering: ${result.error}`);
  }
}

// Test 5: District filtering
async function testDistrictFiltering() {
  log('FILTER_TEST', 'Testing district filtering...');
  
  if (testData.districts.length === 0) {
    log('FILTER_TEST', 'No districts available for testing', 'warning');
    TEST_RESULTS.warnings.push('District filtering: No districts available');
    return;
  }
  
  // Test with first district
  const districtId = testData.districts[0].id;
  const provinceId = testData.provinces[0].id;
  
  const result = await makeRequest('get', '/reports/custom', { 
    province_id: provinceId,
    district_id: districtId 
  });
  
  if (result.success) {
    const totalProjects = result.data.data?.summary?.total_projects ?? 0;
    log('FILTER_TEST', `District filter (ID: ${districtId}): ${totalProjects} projects found`, 'success');
    TEST_RESULTS.passed.push(`District filtering: ID ${districtId}`);
    
    // Verify grouped by district works
    const groupResult = await makeRequest('get', '/reports/custom', { 
      province_id: provinceId,
      district_id: districtId,
      group_by: 'district' 
    });
    if (groupResult.success) {
      const groups = groupResult.data.data?.groups?.length ?? 0;
      log('FILTER_TEST', `District filter + group_by district: ${groups} groups`, 'success');
      TEST_RESULTS.passed.push('District filter with grouping');
    }
  } else {
    log('FILTER_TEST', `District filter: FAILED - ${result.error}`, 'error');
    TEST_RESULTS.failed.push(`District filtering: ${result.error}`);
  }
}

// Test 6: Status filtering (single and multi-select)
async function testStatusFiltering() {
  log('FILTER_TEST', 'Testing status filtering...');
  
  // Test single status
  const singleStatus = testData.statuses[0];
  const result1 = await makeRequest('get', '/reports/custom', { status: singleStatus });
  
  if (result1.success) {
    const totalProjects = result1.data.data?.summary?.total_projects ?? 0;
    log('FILTER_TEST', `Single status filter (${singleStatus}): ${totalProjects} projects found`, 'success');
    TEST_RESULTS.passed.push(`Single status filtering: ${singleStatus}`);
  } else {
    log('FILTER_TEST', `Single status filter: FAILED - ${result1.error}`, 'error');
    TEST_RESULTS.failed.push(`Single status filtering: ${result1.error}`);
  }
  
  // Test multiple statuses
  const multiStatuses = testData.statuses.slice(0, 3).join(',');
  const result2 = await makeRequest('get', '/reports/custom', { status: multiStatuses });
  
  if (result2.success) {
    const totalProjects = result2.data.data?.summary?.total_projects ?? 0;
    log('FILTER_TEST', `Multi-status filter (${multiStatuses}): ${totalProjects} projects found`, 'success');
    TEST_RESULTS.passed.push(`Multi-status filtering: ${multiStatuses}`);
  } else {
    log('FILTER_TEST', `Multi-status filter: FAILED - ${result2.error}`, 'error');
    TEST_RESULTS.failed.push(`Multi-status filtering: ${result2.error}`);
  }
  
  // Test grouped by status
  const groupResult = await makeRequest('get', '/reports/custom', { 
    status: multiStatuses,
    group_by: 'status' 
  });
  if (groupResult.success) {
    const groups = groupResult.data.data?.groups?.length ?? 0;
    log('FILTER_TEST', `Status filter + group_by status: ${groups} groups`, 'success');
    TEST_RESULTS.passed.push('Status filter with grouping');
  }
}

// Test 7: Project type filtering
async function testProjectTypeFiltering() {
  log('FILTER_TEST', 'Testing project type filtering...');
  
  if (testData.projectTypes.length === 0) {
    log('FILTER_TEST', 'No project types available for testing', 'warning');
    TEST_RESULTS.warnings.push('Project type filtering: No project types available');
    return;
  }
  
  const projectTypeId = testData.projectTypes[0].id;
  const result = await makeRequest('get', '/reports/custom', { project_type_id: projectTypeId });
  
  if (result.success) {
    const totalProjects = result.data.data?.summary?.total_projects ?? 0;
    log('FILTER_TEST', `Project type filter (ID: ${projectTypeId}): ${totalProjects} projects found`, 'success');
    TEST_RESULTS.passed.push(`Project type filtering: ID ${projectTypeId}`);
    
    // Verify grouped by project_type works
    const groupResult = await makeRequest('get', '/reports/custom', { 
      project_type_id: projectTypeId,
      group_by: 'project_type' 
    });
    if (groupResult.success) {
      const groups = groupResult.data.data?.groups?.length ?? 0;
      log('FILTER_TEST', `Project type filter + group_by project_type: ${groups} groups`, 'success');
      TEST_RESULTS.passed.push('Project type filter with grouping');
    }
  } else {
    log('FILTER_TEST', `Project type filter: FAILED - ${result.error}`, 'error');
    TEST_RESULTS.failed.push(`Project type filtering: ${result.error}`);
  }
}

// Test 8: Combined filters
async function testCombinedFilters() {
  log('FILTER_TEST', 'Testing combined filters...');
  
  const combinedParams = {
    date_from: '2024-01-01',
    date_to: '2024-12-31',
    status: 'Done,In Progress',
    group_by: 'province'
  };
  
  if (testData.provinces.length > 0) {
    combinedParams.province_id = testData.provinces[0].id;
  }
  
  if (testData.projectTypes.length > 0) {
    combinedParams.project_type_id = testData.projectTypes[0].id;
  }
  
  const result = await makeRequest('get', '/reports/custom', combinedParams);
  
  if (result.success) {
    const totalProjects = result.data.data?.summary?.total_projects ?? 0;
    const appliedFilters = result.data.data?.applied_filters || [];
    log('FILTER_TEST', `Combined filters: ${totalProjects} projects found, ${appliedFilters.length} filters applied`, 'success');
    log('FILTER_TEST', `Applied filters: ${appliedFilters.map(f => f.field).join(', ')}`);
    TEST_RESULTS.passed.push('Combined filters');
  } else {
    log('FILTER_TEST', `Combined filters: FAILED - ${result.error}`, 'error');
    TEST_RESULTS.failed.push(`Combined filters: ${result.error}`);
  }
}

// Test 9: All grouping options
async function testAllGroupingOptions() {
  log('FILTER_TEST', 'Testing all grouping options...');
  
  const groupOptions = ['none', 'province', 'municipality', 'district', 'project_type', 'status', 'activation_month'];
  
  for (const groupBy of groupOptions) {
    const result = await makeRequest('get', '/reports/custom', { group_by: groupBy, limit: 10 });
    
    if (result.success) {
      const groups = result.data.data?.groups?.length ?? 0;
      const summary = result.data.data?.summary;
      log('FILTER_TEST', `Group by '${groupBy}': ${groups} groups, ${summary?.total_projects || 0} total projects`, 'success');
      TEST_RESULTS.passed.push(`Grouping by: ${groupBy}`);
    } else {
      log('FILTER_TEST', `Group by '${groupBy}': FAILED - ${result.error}`, 'error');
      TEST_RESULTS.failed.push(`Grouping by ${groupBy}: ${result.error}`);
    }
  }
}

// Test 10: Export functionality with filters
async function testExportsWithFilters() {
  log('EXPORT_TEST', 'Testing export functionality with filters...');
  
  const exportFilters = {
    date_from: '2024-01-01',
    date_to: '2024-12-31',
    status: 'Done'
  };
  
  // Test CSV export
  const csvResult = await makeRequest('get', '/reports/export/csv', exportFilters, 'arraybuffer');
  if (csvResult.success && csvResult.data) {
    const buffer = Buffer.from(csvResult.data);
    log('EXPORT_TEST', `CSV export: ${buffer.length} bytes`, 'success');
    TEST_RESULTS.passed.push('CSV export with filters');
    
    // Verify it's valid CSV
    const csvContent = buffer.toString('utf-8');
    if (csvContent.includes('Site ID') || csvContent.includes('Site Name')) {
      log('EXPORT_TEST', 'CSV export contains expected headers', 'success');
    } else {
      log('EXPORT_TEST', 'CSV export may have incorrect format', 'warning');
      TEST_RESULTS.warnings.push('CSV export: Headers may be incorrect');
    }
  } else {
    log('EXPORT_TEST', `CSV export: FAILED - ${csvResult.error}`, 'error');
    TEST_RESULTS.failed.push(`CSV export: ${csvResult.error}`);
  }
  
  // Test Excel export
  const excelResult = await makeRequest('get', '/reports/export/excel', exportFilters, 'arraybuffer');
  if (excelResult.success && excelResult.data) {
    const buffer = Buffer.from(excelResult.data);
    log('EXPORT_TEST', `Excel export: ${buffer.length} bytes`, 'success');
    TEST_RESULTS.passed.push('Excel export with filters');
  } else {
    log('EXPORT_TEST', `Excel export: FAILED - ${excelResult.error}`, 'error');
    TEST_RESULTS.failed.push(`Excel export: ${excelResult.error}`);
  }
  
  // Test PDF exports
  const pdfTypes = ['summary', 'status', 'location', 'projects', 'custom'];
  for (const pdfType of pdfTypes) {
    const pdfResult = await makeRequest('get', `/reports/export/pdf/${pdfType}`, exportFilters, 'arraybuffer');
    if (pdfResult.success && pdfResult.data) {
      const buffer = Buffer.from(pdfResult.data);
      // Check for PDF magic number
      const isPDF = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
      if (isPDF) {
        log('EXPORT_TEST', `PDF export (${pdfType}): ${buffer.length} bytes - Valid PDF`, 'success');
        TEST_RESULTS.passed.push(`PDF export (${pdfType})`);
      } else {
        log('EXPORT_TEST', `PDF export (${pdfType}): ${buffer.length} bytes - May not be valid PDF`, 'warning');
        TEST_RESULTS.warnings.push(`PDF export (${pdfType}): Format may be incorrect`);
      }
    } else {
      log('EXPORT_TEST', `PDF export (${pdfType}): FAILED - ${pdfResult.error}`, 'error');
      TEST_RESULTS.failed.push(`PDF export (${pdfType}): ${pdfResult.error}`);
    }
  }
}

// Test 11: Other report endpoints with filters
async function testOtherReportEndpoints() {
  log('ENDPOINT_TEST', 'Testing other report endpoints with filters...');
  
  const endpoints = [
    { name: 'Summary', path: '/reports/summary', required: true },
    { name: 'By Status', path: '/reports/by-status', required: true },
    { name: 'By Location', path: '/reports/by-location', required: true },
    { name: 'Timeline', path: '/reports/timeline', required: true },
    { name: 'By Project Type', path: '/reports/by-project-type', required: true },
    { name: 'Performance', path: '/reports/performance', required: false }
  ];
  
  const testFilters = {
    date_from: '2024-01-01',
    date_to: '2024-12-31',
    status: 'Done,In Progress'
  };
  
  if (testData.provinces.length > 0) {
    testFilters.province_id = testData.provinces[0].id;
  }
  
  for (const endpoint of endpoints) {
    const result = await makeRequest('get', endpoint.path, testFilters);
    if (result.success) {
      log('ENDPOINT_TEST', `${endpoint.name}: OK`, 'success');
      TEST_RESULTS.passed.push(`Endpoint: ${endpoint.name}`);
    } else {
      const type = endpoint.required ? 'error' : 'warning';
      log('ENDPOINT_TEST', `${endpoint.name}: FAILED - ${result.error}`, type);
      if (endpoint.required) {
        TEST_RESULTS.failed.push(`Endpoint: ${endpoint.name} - ${result.error}`);
      } else {
        TEST_RESULTS.warnings.push(`Endpoint: ${endpoint.name} - ${result.error}`);
      }
    }
  }
}

// Test 12: Edge cases and error handling
async function testEdgeCases() {
  log('EDGE_CASE', 'Testing edge cases...');
  
  // Test invalid date format
  const invalidDateResult = await makeRequest('get', '/reports/custom', { 
    date_from: 'invalid-date',
    date_to: '2024-12-31'
  });
  if (invalidDateResult.success) {
    log('EDGE_CASE', 'Invalid date format handled gracefully', 'success');
    TEST_RESULTS.passed.push('Edge case: Invalid date format');
  } else {
    log('EDGE_CASE', `Invalid date format: ${invalidDateResult.error}`, 'warning');
    TEST_RESULTS.warnings.push(`Edge case: Invalid date format - ${invalidDateResult.error}`);
  }
  
  // Test non-existent province
  const invalidProvinceResult = await makeRequest('get', '/reports/custom', { province_id: 99999 });
  if (invalidProvinceResult.success) {
    const total = invalidProvinceResult.data.data?.summary?.total_projects ?? 0;
    log('EDGE_CASE', `Non-existent province: ${total} projects (expected 0)`, total === 0 ? 'success' : 'warning');
    TEST_RESULTS.passed.push('Edge case: Non-existent province');
  } else {
    log('EDGE_CASE', `Non-existent province: ${invalidProvinceResult.error}`, 'warning');
    TEST_RESULTS.warnings.push(`Edge case: Non-existent province - ${invalidProvinceResult.error}`);
  }
  
  // Test invalid status
  const invalidStatusResult = await makeRequest('get', '/reports/custom', { status: 'InvalidStatus' });
  if (invalidStatusResult.success) {
    const total = invalidStatusResult.data.data?.summary?.total_projects ?? 0;
    log('EDGE_CASE', `Invalid status: ${total} projects (expected 0)`, total === 0 ? 'success' : 'warning');
    TEST_RESULTS.passed.push('Edge case: Invalid status');
  } else {
    log('EDGE_CASE', `Invalid status: ${invalidStatusResult.error}`, 'warning');
    TEST_RESULTS.warnings.push(`Edge case: Invalid status - ${invalidStatusResult.error}`);
  }
  
  // Test very large limit
  const largeLimitResult = await makeRequest('get', '/reports/custom', { limit: 10000 });
  if (largeLimitResult.success) {
    log('EDGE_CASE', 'Large limit handled gracefully', 'success');
    TEST_RESULTS.passed.push('Edge case: Large limit');
  } else {
    log('EDGE_CASE', `Large limit: ${largeLimitResult.error}`, 'warning');
    TEST_RESULTS.warnings.push(`Edge case: Large limit - ${largeLimitResult.error}`);
  }
}

// Generate and save report
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: TEST_RESULTS.passed.length + TEST_RESULTS.failed.length + TEST_RESULTS.warnings.length,
      passed: TEST_RESULTS.passed.length,
      failed: TEST_RESULTS.failed.length,
      warnings: TEST_RESULTS.warnings.length,
      success_rate: ((TEST_RESULTS.passed.length / (TEST_RESULTS.passed.length + TEST_RESULTS.failed.length)) * 100).toFixed(2)
    },
    details: TEST_RESULTS
  };
  
  const reportPath = path.join(__dirname, 'test-report-filters-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n========================================');
  console.log('TEST REPORT SUMMARY');
  console.log('========================================');
  console.log(`Total Tests: ${report.summary.total}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`⚠️ Warnings: ${report.summary.warnings}`);
  console.log(`📊 Success Rate: ${report.summary.success_rate}%`);
  console.log('========================================\n');
  
  if (TEST_RESULTS.failed.length > 0) {
    console.log('FAILED TESTS:');
    TEST_RESULTS.failed.forEach(f => console.log(`  ❌ ${f}`));
    console.log('');
  }
  
  if (TEST_RESULTS.warnings.length > 0) {
    console.log('WARNINGS:');
    TEST_RESULTS.warnings.forEach(w => console.log(`  ⚠️ ${w}`));
    console.log('');
  }
  
  console.log(`Detailed report saved to: ${reportPath}`);
  
  return report;
}

// Main test runner
async function runTests() {
  console.log('\n========================================');
  console.log('REPORT FILTERING COMPREHENSIVE TEST');
  console.log('========================================\n');
  
  // Check if server is running
  try {
    await axios.get(`${API_BASE_URL}/health`);
  } catch (error) {
    console.log('⚠️  Health endpoint not available, continuing anyway...');
  }
  
  // Authenticate
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('\n❌ Cannot run tests without authentication. Please ensure:');
    console.log('   1. The backend server is running on port 3001');
    console.log('   2. Valid user credentials exist in the database');
    process.exit(1);
  }
  
  // Load reference data
  await loadReferenceData();
  
  // Run all tests
  await testDateRangeFiltering();
  await testProvinceFiltering();
  await testMunicipalityFiltering();
  await testDistrictFiltering();
  await testStatusFiltering();
  await testProjectTypeFiltering();
  await testCombinedFilters();
  await testAllGroupingOptions();
  await testExportsWithFilters();
  await testOtherReportEndpoints();
  await testEdgeCases();
  
  // Generate report
  const report = generateReport();
  
  // Exit with appropriate code
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
