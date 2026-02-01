/**
 * Reports Routes
 * Dashboard statistics and reporting endpoints
 * 
 * SECURITY NOTES:
 * - All routes require authentication
 * - Export endpoints are rate-limited to prevent abuse (10 requests per minute per IP)
 * - PDF/CSV/Excel exports consume resources; rate limiting protects against DoS
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const reportController = require('../controllers/report.controller');
const { reportValidation } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes in this router
router.use(authenticateToken);

// ============================================
// RATE LIMITING FOR EXPORT ENDPOINTS
// ============================================
// Export operations (PDF, CSV, Excel) are resource-intensive
// Limit to 10 requests per minute per IP to prevent abuse
const exportRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10, // 10 requests per window
  message: {
    success: false,
    message: 'Too many export requests. Please wait a minute before trying again.',
    retryAfter: 60
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for local development (optional)
  skip: (req) => {
    // You can add conditions here to skip rate limiting for certain IPs
    // For example: return req.ip === '127.0.0.1' || req.ip === '::1';
    return false;
  }
});

// Stricter rate limit for resource-intensive PDF generation
const pdfExportRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 5, // 5 PDF exports per minute per IP (PDF generation is more resource-intensive)
  message: {
    success: false,
    message: 'Too many PDF export requests. Please wait a minute before trying again.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

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
// EXPORT ENDPOINTS (Rate Limited)
// ============================================
// CSV and Excel exports - 10 requests per minute
router.get('/export/csv', exportRateLimit, reportValidation.dateRange, reportController.exportCSV);
router.get('/export/excel', exportRateLimit, reportValidation.dateRange, reportController.exportExcel);

// ============================================
// PDF EXPORT ENDPOINTS (Rate Limited)
// ============================================
// PDF generation is more resource-intensive - 5 requests per minute
router.get('/export/pdf/summary', pdfExportRateLimit, reportValidation.dateRange, reportController.exportSummaryPDF);
router.get('/export/pdf/status', pdfExportRateLimit, reportValidation.dateRange, reportController.exportStatusPDF);
router.get('/export/pdf/location', pdfExportRateLimit, reportValidation.dateRange, reportController.exportLocationPDF);
router.get('/export/pdf/projects', pdfExportRateLimit, reportValidation.dateRange, reportController.exportProjectsPDF);
router.get('/export/pdf/custom', pdfExportRateLimit, reportValidation.dateRange, reportController.exportCustomReportPDF);

module.exports = router;
