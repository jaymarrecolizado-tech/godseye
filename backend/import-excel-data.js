/**
 * Import data from database.xlsx into MySQL database
 * Maps Excel columns to the actual database schema
 */

const XLSX = require('xlsx');
const db = require('./src/config/database');
const path = require('path');
const crypto = require('crypto');

// Convert Excel date serial to JavaScript Date
function excelDateToJSDate(excelDate) {
  if (!excelDate) return null;
  
  // Excel dates are number of days since 1900-01-01
  const excelEpoch = new Date(1900, 0, 1);
  const daysToAdd = excelDate - 1;
  const jsDate = new Date(excelEpoch.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  
  // Format as YYYY-MM-DD for MySQL
  return jsDate.toISOString().split('T')[0];
}

// Generate unique UID
function generateUID() {
  return crypto.randomUUID();
}

async function importExcelData() {
  try {
    console.log('📊 Reading database.xlsx...');
    
    // Read the Excel file
    const workbook = XLSX.readFile(path.join(__dirname, '..', 'database.xlsx'));
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📋 Found ${data.length} records to import`);
    
    if (data.length === 0) {
      console.log('⚠️ No data found in Excel file');
      return;
    }
    
    // Show first row to understand structure
    console.log('\n📄 Sample row structure:');
    console.log(data[0]);
    
    let imported = 0;
    let errors = 0;
    
    for (const row of data) {
      try {
        // Map Excel columns to database columns
        const siteCode = row['Site Code'] || row['site_code'];
        const projectName = row['Project Name'] || row['project_name'];
        const siteName = row['Site Name'] || row['site_name'];
        const barangay = row['Barangay'] || row['barangay'];
        const municipality = row['Municipality'] || row['municipality'];
        const province = row['Province'] || row['province'];
        const district = row['District'] || row['district'];
        const latitude = row['Latitude'] || row['latitude'];
        const longitude = row['Longitude'] || row['longitude'];
        const dateActivated = row['Date of Activation'] || row['date_activated'];
        const status = row['Status'] || row['status'];
        
        // Determine project type from project name
        let projectType = 'Free-WIFI';
        if (projectName) {
          const projectNameUpper = projectName.toUpperCase();
          if (projectNameUpper.includes('WIFI')) {
            projectType = 'Free-WIFI';
          } else if (projectNameUpper.includes('PNPKI')) {
            projectType = 'PNPKI';
          } else if (projectNameUpper.includes('IIDB')) {
            projectType = 'IIDB';
          } else if (projectNameUpper.includes('eLGU')) {
            projectType = 'eLGU';
          }
        }
        
        // Convert Excel date to MySQL date
        const formattedDate = excelDateToJSDate(dateActivated);
        
        // Map status to enum values (ongoing, completed, delayed)
        let normalizedStatus = 'ongoing';
        if (status) {
          const statusUpper = status.toString().toUpperCase();
          if (statusUpper === 'DONE' || statusUpper === 'COMPLETED') {
            normalizedStatus = 'completed';
          } else if (statusUpper === 'PENDING' || statusUpper === 'IN PROGRESS' || statusUpper === 'ONGOING') {
            normalizedStatus = 'ongoing';
          } else if (statusUpper === 'CANCELLED' || statusUpper === 'CANCELED' || statusUpper === 'DELAYED') {
            normalizedStatus = 'delayed';
          }
        }
        
        // Generate unique identifiers
        const uid = generateUID();
        const name = siteName || projectName || 'Unnamed Project';
        
        // Insert into database - matching the actual schema
        await db.query(`
          INSERT INTO projects (
            uid,
            name,
            description,
            status,
            progress,
            district,
            lat,
            lng,
            type,
            timeline_start,
            timeline_end,
            site_code,
            site_name,
            barangay,
            locality,
            province,
            date_of_activation,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          uid,
          name,
          `${projectName} - ${siteName || ''}`, // description
          normalizedStatus,
          normalizedStatus === 'completed' ? 100 : (normalizedStatus === 'ongoing' ? 50 : 25), // progress
          district,
          latitude,
          longitude,
          projectType,
          formattedDate, // timeline_start
          null, // timeline_end
          siteCode,
          siteName,
          barangay,
          municipality, // locality
          province,
          formattedDate
        ]);
        
        imported++;
        
        if (imported % 100 === 0) {
          console.log(`✅ Imported ${imported}/${data.length} records...`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ Error importing row ${imported + errors}:`, err.message);
      }
    }
    
    console.log(`\n🎉 Import complete!`);
    console.log(`✅ Successfully imported: ${imported} records`);
    console.log(`❌ Errors: ${errors} records`);
    console.log(`📊 Total: ${data.length} records processed`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the import
importExcelData();
