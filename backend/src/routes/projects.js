/**
 * Projects Routes
 * CRUD operations for project sites
 */

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const geoController = require('../controllers/geo.controller');
const { projectValidation, geospatialValidation } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/auditLogger');
const { csrfProtection } = require('../middleware/csrf');
const { apiRateLimiter } = require('../middleware/rateLimiter');

// Apply authentication to all routes in this router
router.use(authenticateToken);

// ============================================
// LIST PROJECTS
// ============================================
router.get('/', projectValidation.list, projectController.listProjects);

// ============================================
// FIND NEARBY PROJECTS (must be before /:id route)
// ============================================
router.get('/nearby', geospatialValidation.nearby, geoController.getNearbyProjects);

// ============================================
// GET SINGLE PROJECT
// ============================================
router.get('/:id', projectValidation.getById, projectController.getProject);

// ============================================
// CREATE PROJECT
// ============================================
router.post('/', requireRole(['Editor', 'Manager', 'Admin']), apiRateLimiter, csrfProtection, projectValidation.create, auditMiddleware('project_sites'), projectController.createProject);

// ============================================
// UPDATE PROJECT
// ============================================
router.put('/:id', requireRole(['Editor', 'Manager', 'Admin']), apiRateLimiter, csrfProtection, projectValidation.update, auditMiddleware('project_sites'), projectController.updateProject);

// ============================================
// DELETE PROJECT
// ============================================
router.delete('/:id', requireRole(['Editor', 'Manager', 'Admin']), apiRateLimiter, csrfProtection, projectValidation.delete, auditMiddleware('project_sites'), projectController.deleteProject);

// ============================================
// GET PROJECT STATUS HISTORY
// ============================================
router.get('/:id/history', projectValidation.getHistory, projectController.getProjectHistory);

// ============================================
// GET PROJECT ACCOMPLISHMENTS
// ============================================
router.get('/:id/accomplishments', projectValidation.getById, projectController.getProjectAccomplishments);

// ============================================
// ADD PROJECT ACCOMPLISHMENT
// ============================================
router.post('/:id/accomplishments', requireRole(['Editor', 'Manager', 'Admin']), projectValidation.addAccomplishment, auditMiddleware('accomplishments'), projectController.addAccomplishment);

// ============================================
// UPDATE PROJECT ACCOMPLISHMENT
// ============================================
router.put('/:id/accomplishments/:accomplishmentId', requireRole(['Editor', 'Manager', 'Admin']), projectValidation.updateAccomplishment, auditMiddleware('accomplishments'), projectController.updateAccomplishment);

// ============================================
// DELETE PROJECT ACCOMPLISHMENT
// ============================================
router.delete('/:id/accomplishments/:accomplishmentId', requireRole(['Editor', 'Manager', 'Admin']), projectValidation.deleteAccomplishment, auditMiddleware('accomplishments'), projectController.deleteAccomplishment);

module.exports = router;
