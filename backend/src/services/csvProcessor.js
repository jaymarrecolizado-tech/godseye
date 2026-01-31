/**
 * CSV Processor Service
 * Handles CSV parsing, validation, and database import
 */

const fs = require('fs');
const csv = require('csv-parser');
const { query, transaction, getConnection } = require('../config/database');
const notificationService = require('./notificationService');

// Required CSV columns mapping
const COLUMN_MAPPING = {
  'Site Code': 'site_code',
  'Project Name': 'project_type_id',
  'Site Name': 'site_name',
  'Barangay': 'barangay_id',
  'Municipality': 'municipality_id',
  'Province': 'province_id',
  'District': 'district_id',
  'Latitude': 'latitude',
  'Longitude': 'longitude',
  'Date of Activation': 'activation_date',
  'Status': 'status'
};

const REQUIRED_COLUMNS = [
  'Site Code',
  'Project Name',
  'Site Name',
  'Municipality',
  'Province',
  'Latitude',
  'Longitude',
  'Date of Activation',
  'Status'
];

// Valid status values
const VALID_STATUSES = ['Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold'];

// Site code format regex: [PREFIX]-[TYPE]-[NUMBER][SUFFIX]
const SITE_CODE_REGEX = /^[A-Z]+-[A-Z]+-\d+[A-Z]?$/;

// Cache for reference data lookups
let referenceCache = {
  projectTypes: null,
  provinces: null,
  municipalities: null,
  barangays: null,
  districts: null,
  lastUpdated: null
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load reference data into cache
 */
async function loadReferenceCache() {
  const now = Date.now();
  if (referenceCache.lastUpdated && (now - referenceCache.lastUpdated) < CACHE_TTL) {
    return;
  }

  // Load project types
  const projectTypes = await query('SELECT id, name, code_prefix FROM project_types WHERE is_active = TRUE');
  referenceCache.projectTypes = projectTypes.reduce((acc, pt) => {
    acc[pt.name.toLowerCase()] = pt.id;
    return acc;
  }, {});

  // Load provinces
  const provinces = await query('SELECT id, name FROM provinces');
  referenceCache.provinces = provinces.reduce((acc, p) => {
    acc[p.name.toLowerCase()] = p.id;
    return acc;
  }, {});

  // Load municipalities
  const municipalities = await query('SELECT id, name, province_id FROM municipalities');
  referenceCache.municipalities = municipalities.reduce((acc, m) => {
    const key = `${m.name.toLowerCase()}_${m.province_id}`;
    acc[key] = m.id;
    // Also store by name only for lookups
    if (!acc[m.name.toLowerCase()]) {
      acc[m.name.toLowerCase()] = m.id;
    }
    return acc;
  }, {});

  // Load barangays
  const barangays = await query('SELECT id, name, municipality_id FROM barangays');
  referenceCache.barangays = barangays.reduce((acc, b) => {
    const key = `${b.name.toLowerCase()}_${b.municipality_id}`;
    acc[key] = b.id;
    return acc;
  }, {});

  // Load districts
  const districts = await query('SELECT id, name, province_id FROM districts');
  referenceCache.districts = districts.reduce((acc, d) => {
    const key = `${d.name.toLowerCase()}_${d.province_id}`;
    acc[key] = d.id;
    // Also store by name only
    if (!acc[d.name.toLowerCase()]) {
      acc[d.name.toLowerCase()] = d.id;
    }
    return acc;
  }, {});

  referenceCache.lastUpdated = now;
}

/**
 * Parse CSV file and return headers and row count
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<{headers: string[], totalRows: number}>}
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const headers = [];
    let totalRows = 0;
    let headerRowProcessed = false;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headerList) => {
        headers.push(...headerList);
        headerRowProcessed = true;
      })
      .on('data', () => {
        if (headerRowProcessed) {
          totalRows++;
        }
      })
      .on('end', () => {
        resolve({ headers, totalRows });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Validate CSV headers
 * @param {string[]} headers - CSV headers
 * @returns {Object} Validation result
 */
function validateHeaders(headers) {
  const missing = [];
  
  for (const required of REQUIRED_COLUMNS) {
    if (!headers.includes(required)) {
      missing.push(required);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required columns: ${missing.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Validate a single row
 * @param {Object} row - CSV row data
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Object} Validation result
 */
function validateRow(row, rowNumber) {
  const errors = [];

  // Site Code validation
  if (!row['Site Code'] || row['Site Code'].trim() === '') {
    errors.push('Site Code is required');
  } else {
    const siteCode = row['Site Code'].trim();
    if (!SITE_CODE_REGEX.test(siteCode)) {
      errors.push(`Site Code "${siteCode}" does not match expected format [PREFIX]-[TYPE]-[NUMBER][SUFFIX]`);
    }
  }

  // Project Name validation
  if (!row['Project Name'] || row['Project Name'].trim() === '') {
    errors.push('Project Name is required');
  }

  // Site Name validation
  if (!row['Site Name'] || row['Site Name'].trim() === '') {
    errors.push('Site Name is required');
  }

  // Province validation
  if (!row['Province'] || row['Province'].trim() === '') {
    errors.push('Province is required');
  }

  // Municipality validation
  if (!row['Municipality'] || row['Municipality'].trim() === '') {
    errors.push('Municipality is required');
  }

  // Latitude validation
  if (row['Latitude'] === undefined || row['Latitude'] === '') {
    errors.push('Latitude is required');
  } else {
    const lat = parseFloat(row['Latitude']);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('Latitude must be a number between -90 and 90');
    }
  }

  // Longitude validation
  if (row['Longitude'] === undefined || row['Longitude'] === '') {
    errors.push('Longitude is required');
  } else {
    const lng = parseFloat(row['Longitude']);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('Longitude must be a number between -180 and 180');
    }
  }

  // Date of Activation validation
  if (!row['Date of Activation'] || row['Date of Activation'].trim() === '') {
    errors.push('Date of Activation is required');
  } else {
    const date = new Date(row['Date of Activation']);
    if (isNaN(date.getTime())) {
      errors.push('Date of Activation must be a valid date');
    }
  }

  // Status validation
  if (!row['Status'] || row['Status'].trim() === '') {
    errors.push('Status is required');
  } else {
    const status = row['Status'].trim();
    if (!VALID_STATUSES.includes(status)) {
      errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : null
  };
}

/**
 * Look up foreign key IDs from reference data
 * @param {Object} row - CSV row data
 * @returns {Object} Lookup result with IDs
 */
async function lookupForeignKeys(row) {
  await loadReferenceCache();
  
  const result = {
    project_type_id: null,
    province_id: null,
    municipality_id: null,
    barangay_id: null,
    district_id: null,
    errors: []
  };

  // Lookup project type by name
  const projectTypeName = row['Project Name']?.trim().toLowerCase();
  if (projectTypeName) {
    result.project_type_id = referenceCache.projectTypes[projectTypeName];
    if (!result.project_type_id) {
      result.errors.push(`Project type "${row['Project Name']}" not found`);
    }
  }

  // Lookup province by name
  const provinceName = row['Province']?.trim().toLowerCase();
  if (provinceName) {
    result.province_id = referenceCache.provinces[provinceName];
    if (!result.province_id) {
      result.errors.push(`Province "${row['Province']}" not found`);
    }
  }

  // Lookup municipality by name (prefer with province context)
  const municipalityName = row['Municipality']?.trim().toLowerCase();
  if (municipalityName) {
    if (result.province_id) {
      // Try with province context first
      const keyWithProvince = `${municipalityName}_${result.province_id}`;
      result.municipality_id = referenceCache.municipalities[keyWithProvince];
    }
    if (!result.municipality_id) {
      // Fallback to name only
      result.municipality_id = referenceCache.municipalities[municipalityName];
    }
    if (!result.municipality_id) {
      result.errors.push(`Municipality "${row['Municipality']}" not found`);
    }
  }

  // Lookup barangay by name with municipality context
  const barangayName = row['Barangay']?.trim().toLowerCase();
  if (barangayName && result.municipality_id) {
    const key = `${barangayName}_${result.municipality_id}`;
    result.barangay_id = referenceCache.barangays[key];
    if (!result.barangay_id) {
      // Don't error - barangay is optional
      result.barangay_id = null;
    }
  }

  // Lookup district by name with province context
  const districtName = row['District']?.trim().toLowerCase();
  if (districtName && result.province_id) {
    const key = `${districtName}_${result.province_id}`;
    result.district_id = referenceCache.districts[key];
    if (!result.district_id) {
      // Don't error - district is optional
      result.district_id = null;
    }
  }

  return result;
}

/**
 * Check if a project with the given site_code already exists
 * @param {string} siteCode - Site code to check
 * @returns {Promise<Object|null>} Existing project or null
 */
async function checkDuplicate(siteCode) {
  const [existing] = await query(
    'SELECT id, site_code, site_name FROM project_sites WHERE site_code = ?',
    [siteCode]
  );
  return existing || null;
}

/**
 * Process a single row and save to database
 * @param {Object} row - CSV row data
 * @param {number} rowNumber - Row number
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
async function processRow(row, rowNumber, options = {}) {
  const { skipDuplicates = true, updateExisting = false, userId = null } = options;

  try {
    // Validate row
    const validation = validateRow(row, rowNumber);
    if (!validation.valid) {
      return {
        success: false,
        rowNumber,
        siteCode: row['Site Code'],
        errors: validation.errors,
        action: 'skipped'
      };
    }

    // Lookup foreign keys
    const fkLookup = await lookupForeignKeys(row);
    if (fkLookup.errors.length > 0) {
      return {
        success: false,
        rowNumber,
        siteCode: row['Site Code'],
        errors: fkLookup.errors,
        action: 'skipped'
      };
    }

    // Check for duplicates
    const existing = await checkDuplicate(row['Site Code'].trim());
    
    if (existing) {
      if (skipDuplicates && !updateExisting) {
        return {
          success: true,
          rowNumber,
          siteCode: row['Site Code'],
          action: 'skipped',
          message: 'Duplicate site code - skipped'
        };
      }

      if (updateExisting) {
        // Update existing record
        const updateData = {
          site_name: row['Site Name'].trim(),
          project_type_id: fkLookup.project_type_id,
          barangay_id: fkLookup.barangay_id,
          municipality_id: fkLookup.municipality_id,
          province_id: fkLookup.province_id,
          district_id: fkLookup.district_id,
          latitude: parseFloat(row['Latitude']),
          longitude: parseFloat(row['Longitude']),
          activation_date: row['Date of Activation'],
          status: row['Status'].trim(),
          updated_by: userId
        };

        const updateFields = [];
        const params = [];

        for (const [key, value] of Object.entries(updateData)) {
          if (value !== undefined && value !== null) {
            updateFields.push(`${key} = ?`);
            params.push(value);
          }
        }

        params.push(existing.id);

        await query(
          `UPDATE project_sites SET ${updateFields.join(', ')} WHERE id = ?`,
          params
        );

        return {
          success: true,
          rowNumber,
          siteCode: row['Site Code'],
          action: 'updated',
          projectId: existing.id
        };
      }
    }

    // Insert new record
    const insertSql = `
      INSERT INTO project_sites (
        site_code, project_type_id, site_name,
        barangay_id, municipality_id, province_id, district_id,
        latitude, longitude,
        activation_date, status,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(insertSql, [
      row['Site Code'].trim(),
      fkLookup.project_type_id,
      row['Site Name'].trim(),
      fkLookup.barangay_id,
      fkLookup.municipality_id,
      fkLookup.province_id,
      fkLookup.district_id,
      parseFloat(row['Latitude']),
      parseFloat(row['Longitude']),
      row['Date of Activation'],
      row['Status'].trim(),
      userId,
      userId
    ]);

    return {
      success: true,
      rowNumber,
      siteCode: row['Site Code'],
      action: 'created',
      projectId: result.insertId
    };

  } catch (error) {
    return {
      success: false,
      rowNumber,
      siteCode: row['Site Code'],
      errors: [error.message],
      action: 'failed'
    };
  }
}

/**
 * Process entire CSV file
 * @param {string} filePath - Path to CSV file
 * @param {number} importId - Import job ID
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing results
 */
async function processCSVFile(filePath, importId, options = {}) {
  const results = {
    totalRows: 0,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    errors: []
  };

  let connection;
  
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    // Set current user for audit triggers
    const userId = options.userId || null;
    await connection.execute('SET @current_user_id = ?', [userId]);

    // Update import status to Processing
    await connection.execute(
      'UPDATE csv_imports SET status = ?, started_at = NOW() WHERE id = ?',
      ['Processing', importId]
    );

    // Parse and process rows
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    results.totalRows = rows.length;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1;
      const row = rows[i];

      const processResult = await processRow(row, rowNumber, options);

      if (processResult.success) {
        results.successCount++;
        if (processResult.action === 'created') {
          results.createdCount++;
        } else if (processResult.action === 'updated') {
          results.updatedCount++;
        } else if (processResult.action === 'skipped') {
          results.skippedCount++;
        }
      } else {
        results.errorCount++;
        results.errors.push({
          rowNumber: processResult.rowNumber,
          siteCode: processResult.siteCode,
          errors: processResult.errors
        });
      }

      // Update progress every 10 rows
      if (i % 10 === 0) {
        await connection.execute(
          'UPDATE csv_imports SET total_rows = ?, success_count = ?, error_count = ? WHERE id = ?',
          [results.totalRows, results.successCount, results.errorCount, importId]
        );

        // Emit progress update via WebSocket
        if (global.io) {
          global.io.to(`import:${importId}`).emit('import:progress', {
            importId,
            progress: Math.round((i / rows.length) * 100),
            totalRows: results.totalRows,
            processedRows: i,
            successCount: results.successCount,
            errorCount: results.errorCount
          });
        }
      }
    }

    // Determine final status
    let finalStatus = 'Completed';
    if (results.errorCount === results.totalRows) {
      finalStatus = 'Failed';
    } else if (results.errorCount > 0) {
      finalStatus = 'Partial';
    }

    // Update import record with final results
    await connection.execute(
      `UPDATE csv_imports 
       SET status = ?, 
           total_rows = ?, 
           success_count = ?, 
           error_count = ?, 
           errors = ?,
           completed_at = NOW() 
       WHERE id = ?`,
      [
        finalStatus,
        results.totalRows,
        results.successCount,
        results.errorCount,
        JSON.stringify(results.errors),
        importId
      ]
    );

    await connection.commit();

    // Emit completion event
    if (global.io) {
      global.io.to(`import:${importId}`).emit('import:complete', {
        importId,
        status: finalStatus,
        results
      });
    }

    // Send notification to the user who initiated the import
    if (userId) {
      try {
        // Get import details for notification
        const [importRecord] = await query(
          'SELECT original_filename FROM csv_imports WHERE id = ?',
          [importId]
        );

        if (importRecord) {
          notificationService.notifyImportCompleted({
            id: importId,
            original_filename: importRecord.original_filename,
            status: finalStatus,
            success_count: results.successCount,
            error_count: results.errorCount,
            total_rows: results.totalRows
          }, userId).catch(error => {
            console.error('Error sending import completion notification:', error);
          });
        }
      } catch (error) {
        console.error('Error getting import details for notification:', error);
      }
    }

    return results;

  } catch (error) {
    if (connection) {
      await connection.rollback();
      
      // Update import status to Failed
      await connection.execute(
        `UPDATE csv_imports 
         SET status = 'Failed', 
             errors = ?,
             completed_at = NOW() 
         WHERE id = ?`,
        [JSON.stringify([{ message: error.message }]), importId]
      );
    }

    // Emit failure event
    if (global.io) {
      global.io.to(`import:${importId}`).emit('import:error', {
        importId,
        error: error.message
      });
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Generate error report CSV content
 * @param {Array} errors - Array of error objects
 * @returns {string} CSV content
 */
function generateErrorReport(errors) {
  const header = 'Row Number,Site Code,Error Messages\n';
  
  const rows = errors.map(err => {
    const errorMessages = Array.isArray(err.errors) ? err.errors.join('; ') : err.errors;
    return `${err.rowNumber},"${err.siteCode || ''}","${errorMessages}"`;
  }).join('\n');

  return header + rows;
}

/**
 * Geocode address (placeholder - would integrate with geocoding service)
 * @param {string} address - Address to geocode
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
async function geocodeAddress(address) {
  // This is a placeholder for actual geocoding implementation
  // Would integrate with Google Maps, Mapbox, or other geocoding service
  // For now, return null to indicate geocoding not available
  return null;
}

module.exports = {
  parseCSV,
  validateHeaders,
  validateRow,
  processRow,
  processCSVFile,
  generateErrorReport,
  geocodeAddress,
  lookupForeignKeys,
  checkDuplicate,
  loadReferenceCache,
  COLUMN_MAPPING,
  REQUIRED_COLUMNS,
  VALID_STATUSES
};
