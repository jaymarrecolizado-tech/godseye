/**
 * Import Routes
 * CSV import API endpoints
 */

const express = require('express');
const router = express.Router();
const importController = require('../controllers/import.controller');
const { uploadCSV, handleUploadError } = require('../middleware/upload');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes in this router
router.use(authenticateToken);

// All import routes require Editor role or higher
router.use(requireRole(['Editor', 'Manager', 'Admin']));

// ============================================
// POST /api/import/csv - Upload CSV file
// ============================================
router.post('/csv', uploadCSV, handleUploadError, importController.uploadCSV);

// ============================================
// GET /api/import/:id/status - Get import progress
// ============================================
router.get('/:id/status', importController.getImportStatus);

// ============================================
// GET /api/import/:id/download - Download error report
// ============================================
router.get('/:id/download', importController.downloadErrorReport);

// ============================================
// GET /api/import - List recent imports
// ============================================
router.get('/', importController.listImports);

// ============================================
// DELETE /api/import/:id - Cancel/delete import
// ============================================
router.delete('/:id', importController.deleteImport);

module.exports = router;
