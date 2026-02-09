/**
 * Test script for conflict detection functionality
 */

const { detectDuplicates, resolveConflicts } = require('./src/services/csvProcessor');

// Mock CSV data for testing
const testRows = [
  {
    'Site Code': 'UNDP-TEST-001',
    'Project Name': 'Free-WIFI for All',
    'Site Name': 'Test Barangay Hall - AP 1',
    'Barangay': 'Raele',
    'Municipality': 'Itbayat',
    'Province': 'Batanes',
    'District': 'District I',
    'Latitude': '20.728794',
    'Longitude': '121.804235',
    'Date of Activation': '2024-04-29',
    'Status': 'Pending'
  },
  {
    'Site Code': 'UNDP-TEST-002',
    'Project Name': 'Free-WIFI for All',
    'Site Name': 'New Site Name',
    'Barangay': 'Test Barangay',
    'Municipality': 'Test Municipality',
    'Province': 'Batanes',
    'District': 'District I',
    'Latitude': '20.728794',
    'Longitude': '121.804235',
    'Date of Activation': '2024-05-01',
    'Status': 'In Progress'
  },
  {
    'Site Code': 'UNDP-TEST-003',
    'Project Name': 'Tech4ED',
    'Site Name': 'Another Site',
    'Barangay': 'Barangay 1',
    'Municipality': 'Basco',
    'Province': 'Batanes',
    'District': 'District I',
    'Latitude': '20.4485',
    'Longitude': '121.9702',
    'Date of Activation': '2024-06-15',
    'Status': 'Done'
  }
];

async function runTests() {
  console.log('=== Conflict Detection Test ===\n');
  
  try {
    // Test 1: Detect duplicates
    console.log('Test 1: Detecting duplicates in test data...');
    const detectionResults = await detectDuplicates(testRows);
    
    console.log('Detection Results:');
    console.log(`  Total Rows: ${detectionResults.totalRows}`);
    console.log(`  Conflict Count: ${detectionResults.conflictCount}`);
    console.log(`  New Entry Count: ${detectionResults.newEntryCount}`);
    
    if (detectionResults.conflicts.length > 0) {
      console.log('\n  Conflicts Found:');
      detectionResults.conflicts.forEach(conflict => {
        console.log(`    Row ${conflict.rowIndex} (${conflict.conflictType}):`);
        console.log(`      Site Code: ${conflict.existing?.site_code || 'N/A'}`);
        console.log(`      Differences: ${conflict.differences?.join(', ') || 'None'}`);
      });
    }
    
    // Test 2: Resolve conflicts
    console.log('\nTest 2: Resolving conflicts...');
    const resolutions = [
      { rowIndex: 1, action: 'override' },
      { rowIndex: 2, action: 'skip' }
    ];
    
    const resolutionResults = resolveConflicts(detectionResults.conflicts, resolutions);
    
    console.log('Resolution Results:');
    console.log(`  To Override: ${resolutionResults.overrideCount}`);
    console.log(`  To Skip: ${resolutionResults.skipCount}`);
    console.log(`  Unresolved: ${resolutionResults.unresolvedCount}`);
    
    console.log('\n=== All Tests Completed Successfully ===');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();