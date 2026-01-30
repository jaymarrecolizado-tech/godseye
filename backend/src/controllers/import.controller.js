/**
 * Import Controller
 * Business logic for CSV import operations
 */

const path = require('path');
const { query } = require('../config/database');
const { success, STATUS_CODES } = require('../utils/response');
const { deleteUploadedFile } = require('../middleware/upload');
const {
  parseCSV,
  validateHeaders,
  processCSVFile,
  generateErrorReport
} = require('../services/csvProcessor');

/**
 * Handle CSV file upload
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.uploadCSV = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'No File',
        message: 'Please upload a CSV file'
      });
    }

    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    const storedFilename = req.file.filename;
    const userId = req.user.userId;

    // Parse CSV to get headers and validate
    let headers, totalRows;
    try {
      const parseResult = await parseCSV(filePath);
      headers = parseResult.headers;
      totalRows = parseResult.totalRows;
    } catch (parseError) {
      // Delete uploaded file on parse error
      deleteUploadedFile(storedFilename);
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Parse Error',
        message: 'Failed to parse CSV file. Please ensure it is a valid CSV format.',
        details: parseError.message
      });
    }

    // Validate headers
    const headerValidation = validateHeaders(headers);
    if (!headerValidation.valid) {
      // Delete uploaded file on validation error
      deleteUploadedFile(storedFilename);
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid Headers',
        message: headerValidation.error
      });
    }

    // Create import record in database
    const insertResult = await query(
      `INSERT INTO csv_imports 
       (filename, original_filename, total_rows, imported_by, status, created_at) 
       VALUES (?, ?, ?, ?, 'Pending', NOW())`,
      [storedFilename, originalFilename, totalRows, userId]
    );

    const importId = insertResult.insertId;

    // Get processing options from request
    const options = {
      skipDuplicates: req.body.skipDuplicates !== 'false',
      updateExisting: req.body.updateExisting === 'true',
      userId: userId
    };

    // Start processing asynchronously (don't await)
    processCSVFile(filePath, importId, options).catch(error => {
      console.error(`Background processing error for import ${importId}:`, error);
    });

    // Return import job ID immediately
    res.status(STATUS_CODES.ACCEPTED).json(success({
      data: {
        importId,
        filename: originalFilename,
        totalRows,
        status: 'Pending'
      },
      message: 'CSV file uploaded successfully. Processing has started.'
    }));

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      deleteUploadedFile(req.file.filename);
    }
    next(error);
  }
};

/**
 * Get import progress/status
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.getImportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ID
    const importId = parseInt(id, 10);
    if (isNaN(importId) || importId < 1) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid ID',
        message: 'Import ID must be a positive integer'
      });
    }

    // Get import record
    const [importRecord] = await query(
      `SELECT 
        ci.id,
        ci.filename,
        ci.original_filename,
        ci.total_rows,
        ci.success_count,
        ci.error_count,
        ci.errors,
        ci.status,
        ci.started_at,
        ci.completed_at,
        ci.created_at,
        u.full_name as imported_by_name
      FROM csv_imports ci
      LEFT JOIN users u ON ci.imported_by = u.id
      WHERE ci.id = ?`,
      [importId]
    );

    if (!importRecord) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Import job not found'
      });
    }

    // Calculate progress percentage
    let progress = 0;
    if (importRecord.total_rows > 0 && importRecord.status === 'Processing') {
      progress = Math.round(
        ((importRecord.success_count + importRecord.error_count) / importRecord.total_rows) * 100
      );
    } else if (importRecord.status === 'Completed' || importRecord.status === 'Partial') {
      progress = 100;
    }

    // Parse errors JSON
    let errors = [];
    if (importRecord.errors) {
      try {
        errors = typeof importRecord.errors === 'string' 
          ? JSON.parse(importRecord.errors) 
          : importRecord.errors;
      } catch (e) {
        errors = [];
      }
    }

    res.json(success({
      data: {
        id: importRecord.id,
        filename: importRecord.original_filename,
        status: importRecord.status,
        progress,
        totalRows: importRecord.total_rows,
        successCount: importRecord.success_count,
        errorCount: importRecord.error_count,
        errors: errors.slice(0, 100), // Limit to first 100 errors
        errorCountTotal: errors.length,
        startedAt: importRecord.started_at,
        completedAt: importRecord.completed_at,
        createdAt: importRecord.created_at,
        importedBy: importRecord.imported_by_name
      },
      message: 'Import status retrieved successfully'
    }));

  } catch (error) {
    next(error);
  }
};

/**
 * Download error report CSV
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.downloadErrorReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ID
    const importId = parseInt(id, 10);
    if (isNaN(importId) || importId < 1) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid ID',
        message: 'Import ID must be a positive integer'
      });
    }

    // Get import record with errors
    const [importRecord] = await query(
      'SELECT original_filename, errors, status FROM csv_imports WHERE id = ?',
      [importId]
    );

    if (!importRecord) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Import job not found'
      });
    }

    // Check if import has completed
    if (importRecord.status === 'Pending' || importRecord.status === 'Processing') {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Import In Progress',
        message: 'Cannot download error report while import is still processing'
      });
    }

    // Parse errors
    let errors = [];
    if (importRecord.errors) {
      try {
        errors = typeof importRecord.errors === 'string' 
          ? JSON.parse(importRecord.errors) 
          : importRecord.errors;
      } catch (e) {
        errors = [];
      }
    }

    if (errors.length === 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'No Errors',
        message: 'No errors to report for this import'
      });
    }

    // Generate error report CSV
    const csvContent = generateErrorReport(errors);

    // Set headers for file download
    const originalName = importRecord.original_filename.replace('.csv', '');
    const downloadFilename = `${originalName}_errors.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.send(csvContent);

  } catch (error) {
    next(error);
  }
};

/**
 * List import history
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.listImports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Get total count
    const [countResult] = await query('SELECT COUNT(*) as total FROM csv_imports');
    const total = countResult.total;

    // Get imports
    const imports = await query(
      `SELECT 
        ci.id,
        ci.original_filename,
        ci.total_rows,
        ci.success_count,
        ci.error_count,
        ci.status,
        ci.started_at,
        ci.completed_at,
        ci.created_at,
        u.full_name as imported_by_name
      FROM csv_imports ci
      LEFT JOIN users u ON ci.imported_by = u.id
      ORDER BY ci.created_at DESC
      LIMIT ? OFFSET ?`,
      [parseInt(limit, 10), offset]
    );

    res.json(success({
      data: imports,
      meta: {
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      },
      message: 'Import history retrieved successfully'
    }));

  } catch (error) {
    next(error);
  }
};

/**
 * Cancel/delete import
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
exports.deleteImport = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ID
    const importId = parseInt(id, 10);
    if (isNaN(importId) || importId < 1) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid ID',
        message: 'Import ID must be a positive integer'
      });
    }

    // Get import record
    const [importRecord] = await query(
      'SELECT filename, status FROM csv_imports WHERE id = ?',
      [importId]
    );

    if (!importRecord) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Not Found',
        message: 'Import job not found'
      });
    }

    // Delete uploaded file if exists
    if (importRecord.filename) {
      deleteUploadedFile(importRecord.filename);
    }

    // Delete import record
    await query('DELETE FROM csv_imports WHERE id = ?', [importId]);

    res.json(success({
      data: { id: importId },
      message: 'Import job deleted successfully'
    }));

  } catch (error) {
    next(error);
  }
};
