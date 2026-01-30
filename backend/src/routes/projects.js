/**
 * Projects Routes
 * CRUD operations for project sites
 */

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { projectValidation } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes in this router
router.use(authenticateToken);

// ============================================
// LIST PROJECTS
// ============================================
router.get('/', projectValidation.list, projectController.listProjects);

// ============================================
// GET SINGLE PROJECT
// ============================================
router.get('/:id', projectValidation.getById, projectController.getProject);

// ============================================
// CREATE PROJECT
// ============================================
router.post('/', requireRole(['Editor', 'Manager', 'Admin']), projectValidation.create, projectController.createProject);

// ============================================
// UPDATE PROJECT
// ============================================
router.put('/:id', requireRole(['Editor', 'Manager', 'Admin']), projectValidation.update, projectController.updateProject);

// ============================================
// DELETE PROJECT
// ============================================
router.delete('/:id', requireRole(['Editor', 'Manager', 'Admin']), projectValidation.delete, projectController.deleteProject);

// ============================================
// GET PROJECT STATUS HISTORY
// ============================================
router.get('/:id/history', projectValidation.getHistory, projectController.getProjectHistory);

module.exports = router;
