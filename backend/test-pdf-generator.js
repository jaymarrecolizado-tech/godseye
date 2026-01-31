/**
 * Direct test of PDF Generator Service
 */

const pdfGenerator = require('./src/services/pdfGenerator');
const fs = require('fs');
const path = require('path');

// Mock data for testing
const mockSummaryData = {
  data: {
    summary: {
      total_projects: 150,
      completion_rate: 75,
      in_progress: 30,
      done: 100,
      pending: 15,
      cancelled: 3,
      on_hold: 2,
      provinces_with_projects: 15,
      municipalities_with_projects: 45,
      active_project_types: 5
    },
    trends: [
      { month: '2025-02', count: 10, completed: 8 },
      { month: '2025-03', count: 15, completed: 10 },
      { month: '2025-04', count: 12, completed: 9 },
      { month: '2025-05', count: 18, completed: 12 },
      { month: '2025-06', count: 20, completed: 15 },
      { month: '2025-07', count: 25, completed: 18 }
    ],
    recent_activity: [
      {
        site_code: 'WIFI-001',
        site_name: 'Barangay Hall WiFi',
        project_type: 'Free-WIFI',
        color_code: '#22c55e',
        province: 'Cebu',
        status: 'Done',
        updated_at: '2025-07-15T10:30:00Z'
      },
      {
        site_code: 'PNPKI-042',
        site_name: 'Municipal Office',
        project_type: 'PNPKI',
        color_code: '#ef4444',
        province: 'Manila',
        status: 'In Progress',
        updated_at: '2025-07-14T14:20:00Z'
      },
      {
        site_code: 'IIDB-015',
        site_name: 'Provincial Capitol',
        project_type: 'IIDB',
        color_code: '#3b82f6',
        province: 'Davao',
        status: 'Pending',
        updated_at: '2025-07-13T09:15:00Z'
      }
    ]
  }
};

const mockStatusData = {
  data: {
    breakdown: [
      { project_type: 'Free-WIFI', color_code: '#22c55e', total: 60, pending: 5, in_progress: 10, done: 42, cancelled: 2, on_hold: 1, completion_percentage: 70 },
      { project_type: 'PNPKI', color_code: '#ef4444', total: 45, pending: 8, in_progress: 12, done: 22, cancelled: 2, on_hold: 1, completion_percentage: 48.9 },
      { project_type: 'IIDB', color_code: '#3b82f6', total: 30, pending: 2, in_progress: 6, done: 21, cancelled: 1, on_hold: 0, completion_percentage: 70 },
      { project_type: 'eLGU', color_code: '#eab308', total: 15, pending: 0, in_progress: 2, done: 12, cancelled: 0, on_hold: 1, completion_percentage: 80 }
    ],
    total: 150,
    group_by: 'project_type'
  }
};

const mockLocationData = {
  data: {
    locations: [
      { province: 'Cebu', region_code: '07', total_projects: 45, completed: 35, in_progress: 8, pending: 2, municipalities_count: 12, project_types: 4 },
      { province: 'Manila', region_code: 'NCR', total_projects: 38, completed: 28, in_progress: 7, pending: 3, municipalities_count: 1, project_types: 5 },
      { province: 'Davao', region_code: '11', total_projects: 32, completed: 22, in_progress: 6, pending: 4, municipalities_count: 8, project_types: 4 },
      { province: 'Cavite', region_code: '04', total_projects: 20, completed: 10, in_progress: 5, pending: 4, cancelled: 1, municipalities_count: 7, project_types: 3 },
      { province: 'Bohol', region_code: '07', total_projects: 15, completed: 5, in_progress: 4, pending: 5, cancelled: 1, municipalities_count: 6, project_types: 3 }
    ],
    summary: {
      provinces_with_projects: 15,
      municipalities_with_projects: 45,
      barangays_with_projects: 120
    }
  },
  level: 'province'
};

const mockProjectsData = [
  { site_code: 'WIFI-001', site_name: 'Barangay Hall WiFi', project_type: 'Free-WIFI', province: 'Cebu', municipality: 'Cebu City', barangay: 'Lahug', status: 'Done', latitude: 10.3157, longitude: 123.8854, activation_date: '2025-01-15' },
  { site_code: 'PNPKI-042', site_name: 'Municipal Office', project_type: 'PNPKI', province: 'Manila', municipality: 'Manila', barangay: 'Ermita', status: 'In Progress', latitude: 14.5995, longitude: 120.9842, activation_date: '2025-03-20' },
  { site_code: 'IIDB-015', site_name: 'Provincial Capitol', project_type: 'IIDB', province: 'Davao', municipality: 'Davao City', barangay: 'Poblacion', status: 'Pending', latitude: 7.1907, longitude: 125.4553, activation_date: null },
  { site_code: 'WIFI-089', site_name: 'Community Center', project_type: 'Free-WIFI', province: 'Cavite', municipality: 'Bacoor', barangay: 'Molino', status: 'Done', latitude: 14.4140, longitude: 120.9730, activation_date: '2025-02-10' }
];

async function testPDFGenerator() {
  console.log('==============================================');
  console.log('Testing PDF Generator Service');
  console.log('==============================================\n');

  const tests = [
    { name: 'Summary Report', fn: () => pdfGenerator.generateSummaryReportPDF(mockSummaryData) },
    { name: 'Status Report', fn: () => pdfGenerator.generateStatusReportPDF(mockStatusData) },
    { name: 'Location Report', fn: () => pdfGenerator.generateLocationReportPDF(mockLocationData) },
    { name: 'Projects Report', fn: () => pdfGenerator.generateProjectsPDF(mockProjectsData) }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`Generating ${test.name}...`);
    try {
      const pdfBuffer = await test.fn();
      
      // Save PDF file
      const filename = `test-${test.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      const filepath = path.join(__dirname, 'uploads', filename);
      fs.writeFileSync(filepath, pdfBuffer);
      
      console.log(`  ✅ SUCCESS - PDF generated (${pdfBuffer.length} bytes)`);
      console.log(`  📄 Saved to: ${filepath}\n`);
      results.push({ name: test.name, status: 'SUCCESS', size: pdfBuffer.length });
    } catch (error) {
      console.log(`  ❌ FAILED - ${error.message}\n`);
      results.push({ name: test.name, status: 'FAILED', error: error.message });
    }
  }

  // Summary
  console.log('==============================================');
  console.log('Test Summary');
  console.log('==============================================');
  
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Passed: ${successCount}`);
  console.log(`Failed: ${results.length - successCount}`);
  
  console.log('\nDetailed Results:');
  results.forEach(result => {
    const icon = result.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`  ${icon} ${result.name}: ${result.status}${result.size ? ` (${result.size} bytes)` : ''}`);
  });

  return results;
}

// Run tests
console.log('PDF Generator Direct Test\n');
console.log('This script tests the PDF generator service directly without HTTP.\n');

testPDFGenerator()
  .then(results => {
    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    console.log('\n' + (successCount === results.length ? 'All tests passed!' : 'Some tests failed.'));
    process.exit(successCount === results.length ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
