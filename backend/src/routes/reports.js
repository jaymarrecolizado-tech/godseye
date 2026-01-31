/**
 * Reports Routes
 * Dashboard statistics and reporting endpoints
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { reportValidation } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes in this router
router.use(authenticateToken);

// ============================================
// DASHBOARD SUMMARY
// ============================================
router.get('/summary', reportValidation.dateRange, reportController.getSummary);

// ============================================
// STATUS BREAKDOWN REPORT
// ============================================
router.get('/by-status', reportValidation.dateRange, reportController.getByStatus);

// ============================================
// LOCATION BREAKDOWN REPORT
// ============================================
router.get('/by-location', reportValidation.dateRange, reportController.getByLocation);

// ============================================
// TIMELINE REPORT
// ============================================
router.get('/timeline', reportValidation.dateRange, reportController.getTimeline);

// ============================================
// PROJECT TYPE ANALYSIS
// ============================================
router.get('/by-project-type', reportValidation.dateRange, reportController.getByProjectType);

// ============================================
// PERFORMANCE METRICS
// ============================================
router.get('/performance', reportController.getPerformance);

// ============================================
// CUSTOM REPORT WITH FILTERS AND GROUPING
// ============================================
router.get('/custom', reportValidation.dateRange, reportController.getCustomReport);

// ============================================
// EXPORT ENDPOINTS
// ============================================
router.get('/export/csv', reportValidation.dateRange, reportController.exportCSV);
router.get('/export/excel', reportValidation.dateRange, reportController.exportExcel);

// ============================================
// PDF EXPORT ENDPOINTS
// ============================================
router.get('/export/pdf/summary', reportValidation.dateRange, reportController.exportSummaryPDF);
router.get('/export/pdf/status', reportValidation.dateRange, reportController.exportStatusPDF);
router.get('/export/pdf/location', reportValidation.dateRange, reportController.exportLocationPDF);
router.get('/export/pdf/projects', reportValidation.dateRange, reportController.exportProjectsPDF);
router.get('/export/pdf/custom', reportValidation.dateRange, reportController.exportCustomReportPDF);

module.exports = router;
