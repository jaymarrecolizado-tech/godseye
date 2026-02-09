/**
 * Import Excel Data Script
 * Reads database.xlsx and imports data into project_sites table
 * Handles location lookups and project type mappings
 */

const xlsx = require('xlsx');
const path = require('path');
const { query, transaction } = require('../src/config/database');

// Excel file path
const EXCEL_FILE_PATH = path.join(__dirname, '..', '..', 'database.xlsx');

// Status mapping from Excel to database enum
const STATUS_MAP = {
    'Done': 'Done',
    'Pending': 'Pending',
    'In Progress': 'In Progress',
    'Cancelled': 'Cancelled',
    'On Hold': 'On Hold'
};

/**
 * Parse date from Excel serial or string format
 */
function parseDate(dateValue) {
    if (!dateValue) return null;
    
    // If it's already a Date object
    if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
    }
    
    // If it's an Excel serial number
    if (typeof dateValue === 'number') {
        // Excel dates are number of days since 1900-01-01
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
    }
    
    // If it's a string
    if (typeof dateValue === 'string') {
        // Try to parse various date formats
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }
    
    return null;
}

/**
 * Parse latitude/longitude coordinates
 */
function parseCoordinate(coordValue) {
    if (!coordValue && coordValue !== 0) return null;
    
    const num = parseFloat(coordValue);
    if (isNaN(num)) return null;
    
    return num;
}

/**
 * Get or create project type based on site code prefix
 */
async function getProjectTypeId(siteCode, projectName) {
    // Extract prefix from site code (e.g., "UNDP-GI-0009A" -> "UNDP")
    const prefix = siteCode ? siteCode.split('-')[0] : null;
    
    if (!prefix) return null;
    
    // Try to find project type by code_prefix
    const [projectType] = await query(
        'SELECT id FROM project_types WHERE code_prefix = ?',
        [prefix]
    );
    
    if (projectType) {
        return projectType.id;
    }
    
    // If not found by prefix, try by project name
    const [projectTypeByName] = await query(
        'SELECT id FROM project_types WHERE name = ?',
        [projectName]
    );
    
    if (projectTypeByName) {
        return projectTypeByName.id;
    }
    
    return null;
}

/**
 * Get location IDs from province, municipality, district, and barangay names
 */
async function getLocationIds(province, municipality, district, barangay) {
    const result = {
        provinceId: null,
        municipalityId: null,
        districtId: null,
        barangayId: null
    };
    
    if (!province) return result;
    
    // Get province ID
    const [provinceRow] = await query(
        'SELECT id FROM provinces WHERE name = ?',
        [province.trim()]
    );
    
    if (provinceRow) {
        result.provinceId = provinceRow.id;
    }
    
    // Get district ID if district is provided
    if (district && result.provinceId) {
        const districtName = district.trim().replace(/District\s*/i, '');
        const [districtRow] = await query(
            'SELECT id FROM districts WHERE province_id = ? AND (name = ? OR name LIKE ?)',
            [result.provinceId, district.trim(), `%District ${districtName}%`]
        );
        
        if (districtRow) {
            result.districtId = districtRow.id;
        }
    }
    
    // Get municipality ID
    if (municipality && result.provinceId) {
        const [municipalityRow] = await query(
            'SELECT id FROM municipalities WHERE province_id = ? AND name = ?',
            [result.provinceId, municipality.trim()]
        );
        
        if (municipalityRow) {
            result.municipalityId = municipalityRow.id;
        }
    }
    
    // Get barangay ID
    if (barangay && result.municipalityId) {
        const [barangayRow] = await query(
            'SELECT id FROM barangays WHERE municipality_id = ? AND name = ?',
            [result.municipalityId, barangay.trim()]
        );
        
        if (barangayRow) {
            result.barangayId = barangayRow.id;
        }
    }
    
    return result;
}

/**
 * Read and parse the Excel file
 */
function readExcelFile(filePath) {
    console.log(`Reading Excel file: ${filePath}`);
    
    try {
        const workbook = xlsx.readFile(filePath);
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        console.log(`  Sheet: ${sheetName}`);
        
        // Convert to JSON
        const rows = xlsx.utils.sheet_to_json(worksheet, { 
            header: 1,
            raw: false,
            defval: ''
        });
        
        // Skip header row and filter out empty rows
        const dataRows = rows.slice(1).filter(row => 
            row.length > 0 && row[0] && row[0].toString().trim() !== ''
        );
        
        console.log(`  Total rows: ${dataRows.length}`);
        console.log();
        
        return dataRows;
        
    } catch (error) {
        throw new Error(`Failed to read Excel file: ${error.message}`);
    }
}

/**
 * Process a single row from the Excel file
 */
async function processRow(row, rowIndex) {
    // Excel column mapping (0-indexed):
    // 0: Site Code
    // 1: Project Name
    // 2: Site Name
    // 3: Barangay
    // 4: Municipality
    // 5: Province
    // 6: District
    // 7: Latitude
    // 8: Longitude
    // 9: Date of Activation
    // 10: Status
    
    const siteCode = row[0] ? row[0].toString().trim() : '';
    const projectName = row[1] ? row[1].toString().trim() : '';
    const siteName = row[2] ? row[2].toString().trim() : '';
    const barangay = row[3] ? row[3].toString().trim() : '';
    const municipality = row[4] ? row[4].toString().trim() : '';
    const province = row[5] ? row[5].toString().trim() : '';
    const district = row[6] ? row[6].toString().trim() : '';
    const latitude = parseCoordinate(row[7]);
    const longitude = parseCoordinate(row[8]);
    const activationDate = parseDate(row[9]);
    const status = row[10] ? row[10].toString().trim() : 'Pending';
    
    // Validate required fields
    if (!siteCode) {
        throw new Error(`Row ${rowIndex + 2}: Site Code is required`);
    }
    
    if (!latitude || !longitude) {
        throw new Error(`Row ${rowIndex + 2}: Valid coordinates are required (${siteCode})`);
    }
    
    // Get project type ID
    const projectTypeId = await getProjectTypeId(siteCode, projectName);
    if (!projectTypeId) {
        throw new Error(`Row ${rowIndex + 2}: Could not determine project type for ${siteCode}`);
    }
    
    // Get location IDs
    const locationIds = await getLocationIds(province, municipality, district, barangay);
    
    if (!locationIds.provinceId) {
        throw new Error(`Row ${rowIndex + 2}: Province not found: ${province}`);
    }
    
    if (!locationIds.municipalityId) {
        throw new Error(`Row ${rowIndex + 2}: Municipality not found: ${municipality}`);
    }
    
    // Map status
    const mappedStatus = STATUS_MAP[status] || 'Pending';
    
    return {
        site_code: siteCode,
        project_type_id: projectTypeId,
        site_name: siteName || projectName,
        barangay_id: locationIds.barangayId,
        municipality_id: locationIds.municipalityId,
        province_id: locationIds.provinceId,
        district_id: locationIds.districtId,
        latitude: latitude,
        longitude: longitude,
        activation_date: activationDate,
        status: mappedStatus,
        remarks: null,
        metadata: JSON.stringify({
            original_project_name: projectName,
            barangay_name: barangay,
            district_name: district
        })
    };
}

/**
 * Insert a project into the database
 */
async function insertProject(projectData, connection) {
    const sql = `
        INSERT INTO project_sites (
            site_code, project_type_id, site_name, barangay_id,
            municipality_id, province_id, district_id, latitude,
            longitude, activation_date, status, remarks, metadata,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const params = [
        projectData.site_code,
        projectData.project_type_id,
        projectData.site_name,
        projectData.barangay_id,
        projectData.municipality_id,
        projectData.province_id,
        projectData.district_id,
        projectData.latitude,
        projectData.longitude,
        projectData.activation_date,
        projectData.status,
        projectData.remarks,
        projectData.metadata
    ];
    
    const [result] = await connection.query(sql, params);
    return result.insertId;
}

/**
 * Main import function
 */
async function importExcelData() {
    console.log('='.repeat(60));
    console.log('Importing Excel Data to Database');
    console.log('='.repeat(60));
    console.log();
    
    const stats = {
        total: 0,
        success: 0,
        errors: 0,
        errorsList: []
    };
    
    try {
        // Read Excel file
        const rows = readExcelFile(EXCEL_FILE_PATH);
        stats.total = rows.length;
        
        if (rows.length === 0) {
            console.log('No data rows found in Excel file.');
            return { success: true, stats };
        }
        
        console.log('Starting import...');
        console.log();
        
        // Process each row
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            try {
                // Process the row
                const projectData = await processRow(row, i);
                
                // Insert into database within a transaction
                await transaction(async (connection) => {
                    await insertProject(projectData, connection);
                });
                
                stats.success++;
                
                // Show progress every 5 records
                if ((i + 1) % 5 === 0 || i === rows.length - 1) {
                    process.stdout.write(`\r  Progress: ${i + 1}/${rows.length} (${stats.success} imported, ${stats.errors} errors)`);
                }
                
            } catch (error) {
                stats.errors++;
                stats.errorsList.push({
                    row: i + 2,
                    error: error.message,
                    siteCode: row[0] || 'N/A'
                });
                
                // Continue with next row even if one fails
                continue;
            }
        }
        
        console.log(); // New line after progress
        console.log();
        
        // Print summary
        console.log('='.repeat(60));
        console.log('Import Summary');
        console.log('='.repeat(60));
        console.log();
        console.log(`Total rows processed: ${stats.total}`);
        console.log(`Successfully imported: ${stats.success}`);
        console.log(`Errors: ${stats.errors}`);
        console.log();
        
        // Print errors if any
        if (stats.errorsList.length > 0) {
            console.log('Errors encountered:');
            stats.errorsList.forEach(err => {
                console.log(`  - Row ${err.row} (${err.siteCode}): ${err.error}`);
            });
            console.log();
        }
        
        // Verify import
        console.log('Verifying import...');
        const [countResult] = await query('SELECT COUNT(*) as count FROM project_sites');
        const [sampleResult] = await query('SELECT site_code, site_name, status FROM project_sites LIMIT 3');
        
        console.log(`  Total projects in database: ${countResult.count}`);
        console.log();
        console.log('Sample data:');
        sampleResult.forEach((row, idx) => {
            console.log(`  ${idx + 1}. ${row.site_code} - ${row.site_name} (${row.status})`);
        });
        console.log();
        
        console.log('='.repeat(60));
        console.log('Import Complete');
        console.log('='.repeat(60));
        
        return {
            success: true,
            stats,
            totalInDb: countResult.count,
            sample: sampleResult
        };
        
    } catch (error) {
        console.error();
        console.error('✗ Import failed:');
        console.error('  ', error.message);
        console.error();
        
        return {
            success: false,
            error: error.message,
            stats
        };
    }
}

// Run the script if called directly
if (require.main === module) {
    importExcelData()
        .then(result => {
            if (!result.success) {
                process.exit(1);
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { importExcelData };
