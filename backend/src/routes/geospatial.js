/**
 * Geospatial Routes
 * Map data and spatial query endpoints
 */

const express = require('express');
const router = express.Router();
const geoController = require('../controllers/geo.controller');
const { geospatialValidation } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes in this router
router.use(authenticateToken);

// ============================================
// GET ALL PROJECTS AS GEOJSON
// ============================================
router.get('/map-data', geoController.getMapData);

// ============================================
// FIND PROJECTS WITHIN RADIUS
// ============================================
router.get('/projects/nearby', geospatialValidation.nearby, geoController.getNearbyProjects);

// ============================================
// GET PROJECTS WITHIN BOUNDING BOX
// ============================================
router.post('/projects/bounding-box', geospatialValidation.boundingBox, geoController.getProjectsInBoundingBox);

// ============================================
// GET PROJECT CLUSTERS (for heatmap)
// ============================================
router.get('/clusters', geoController.getClusters);

// ============================================
// GET LOCATION BOUNDARIES (for provinces/municipalities)
// ============================================
router.get('/boundaries/:type/:id', geoController.getBoundary);

// ============================================
// GET DISTRICT BOUNDS (for zoom to district)
// ============================================
router.get('/district-bounds/:districtId', geoController.getDistrictBounds);

// ============================================
// GET PROJECTS IN DISTRICT
// ============================================
router.get('/district-projects/:districtId', geoController.getProjectsInDistrict);

// ============================================
// GET UNIQUE PROJECT TYPES (only types with projects)
// ============================================
router.get('/project-types', geoController.getUniqueProjectTypes);

module.exports = router;
