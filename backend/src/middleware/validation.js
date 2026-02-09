/**
 * Validation Middleware
 * Input validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const { validationError } = require('../utils/response');

/**
 * Handle validation errors middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(422).json(validationError(errors.array()));
  }
  
  next();
};

/**
 * Common validation rules
 */
const commonRules = {
  // Pagination
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  // ID parameters
  id: param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
    .toInt(),
  
  // Geographic coordinates
  latitude: (field = 'latitude') => 
    body(field)
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
  
  longitude: (field = 'longitude') => 
    body(field)
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
  
  queryLatitude: (field = 'lat') =>
    query(field)
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
  
  queryLongitude: (field = 'lng') =>
    query(field)
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180')
};

/**
 * Project validation rules
 */
const projectValidation = {
  // Create project
  create: [
    body('site_code')
      .trim()
      .notEmpty()
      .withMessage('Site code is required')
      .isLength({ min: 3, max: 30 })
      .withMessage('Site code must be between 3 and 30 characters')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('Site code can only contain letters, numbers, and hyphens'),
    
    body('project_type_id')
      .notEmpty()
      .withMessage('Project type is required')
      .isInt({ min: 1 })
      .withMessage('Project type ID must be a positive integer')
      .toInt(),
    
    body('site_name')
      .trim()
      .notEmpty()
      .withMessage('Site name is required')
      .isLength({ min: 2, max: 150 })
      .withMessage('Site name must be between 2 and 150 characters'),
    
    body('implementing_agency')
      .optional({ nullable: true })
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage('Implementing agency must be between 2 and 150 characters'),
    
    body('budget')
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage('Budget must be a positive number'),
    
    body('description')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description cannot exceed 5000 characters'),
    
    body('expected_output')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Expected output cannot exceed 5000 characters'),
    
    body('province_id')
      .notEmpty()
      .withMessage('Province is required')
      .isInt({ min: 1 })
      .withMessage('Province ID must be a positive integer')
      .toInt(),
    
    body('municipality_id')
      .notEmpty()
      .withMessage('Municipality is required')
      .isInt({ min: 1 })
      .withMessage('Municipality ID must be a positive integer')
      .toInt(),
    
    body('barangay_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Barangay ID must be a positive integer')
      .toInt(),
    
    body('district_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('District ID must be a positive integer')
      .toInt(),
    
    commonRules.latitude(),
    commonRules.longitude(),
    
    body('activation_date')
      .optional()
      .isISO8601()
      .withMessage('Activation date must be a valid date (YYYY-MM-DD)')
      .toDate(),
    
    body('start_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Start date must be a valid date (YYYY-MM-DD)')
      .toDate(),
    
    body('end_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('End date must be a valid date (YYYY-MM-DD)')
      .toDate(),
    
    body('status')
      .optional()
      .isIn(['Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold'])
      .withMessage('Status must be one of: Pending, In Progress, Done, Cancelled, On Hold'),
    
    body('remarks')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Remarks cannot exceed 5000 characters'),
    
    handleValidationErrors
  ],
  
  // Update project
  update: [
    commonRules.id,
    
    body('site_code')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Site code must be between 3 and 30 characters')
      .matches(/^[A-Za-z0-9-]+$/)
      .withMessage('Site code can only contain letters, numbers, and hyphens'),
    
    body('project_type_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Project type ID must be a positive integer')
      .toInt(),
    
    body('site_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage('Site name must be between 2 and 150 characters'),
    
    body('implementing_agency')
      .optional({ nullable: true })
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage('Implementing agency must be between 2 and 150 characters'),
    
    body('budget')
      .optional({ nullable: true })
      .isFloat({ min: 0 })
      .withMessage('Budget must be a positive number'),
    
    body('description')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description cannot exceed 5000 characters'),
    
    body('expected_output')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Expected output cannot exceed 5000 characters'),
    
    body('province_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Province ID must be a positive integer')
      .toInt(),
    
    body('municipality_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Municipality ID must be a positive integer')
      .toInt(),
    
    body('barangay_id')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('Barangay ID must be a positive integer')
      .toInt(),
    
    body('district_id')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('District ID must be a positive integer')
      .toInt(),
    
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    
    body('activation_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Activation date must be a valid date (YYYY-MM-DD)')
      .toDate(),
    
    body('start_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Start date must be a valid date (YYYY-MM-DD)')
      .toDate(),
    
    body('end_date')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('End date must be a valid date (YYYY-MM-DD)')
      .toDate(),
    
    body('status')
      .optional()
      .isIn(['Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold'])
      .withMessage('Status must be one of: Pending, In Progress, Done, Cancelled, On Hold'),
    
    body('remarks')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Remarks cannot exceed 5000 characters'),
    
    handleValidationErrors
  ],
  
  // Get single project
  getById: [
    commonRules.id,
    handleValidationErrors
  ],
  
  // Delete project
  delete: [
    commonRules.id,
    handleValidationErrors
  ],
  
  // Get project history
  getHistory: [
    commonRules.id,
    handleValidationErrors
  ],

  // Add accomplishment
  addAccomplishment: [
    commonRules.id,
    
    body('accomplishment_date')
      .optional()
      .isISO8601()
      .withMessage('Accomplishment date must be a valid date (YYYY-MM-DD)')
      .toDate(),
    
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Accomplishment description is required')
      .isLength({ min: 2, max: 2000 })
      .withMessage('Description must be between 2 and 2000 characters'),
    
    body('percentage_complete')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Percentage complete must be between 0 and 100'),
    
    body('actual_output')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Actual output cannot exceed 2000 characters'),
    
    body('remarks')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Remarks cannot exceed 1000 characters'),
    
    handleValidationErrors
  ],

  // Update accomplishment
  updateAccomplishment: [
    commonRules.id,
    
    param('accomplishmentId')
      .isInt({ min: 1 })
      .withMessage('Accomplishment ID must be a positive integer')
      .toInt(),
    
    body('accomplishment_date')
      .optional()
      .isISO8601()
      .withMessage('Accomplishment date must be a valid date (YYYY-MM-DD)')
      .toDate(),
    
    body('description')
      .optional()
      .trim()
      .isLength({ min: 2, max: 2000 })
      .withMessage('Description must be between 2 and 2000 characters'),
    
    body('percentage_complete')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Percentage complete must be between 0 and 100'),
    
    body('actual_output')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Actual output cannot exceed 2000 characters'),
    
    body('remarks')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Remarks cannot exceed 1000 characters'),
    
    handleValidationErrors
  ],

  // Delete accomplishment
  deleteAccomplishment: [
    commonRules.id,
    
    param('accomplishmentId')
      .isInt({ min: 1 })
      .withMessage('Accomplishment ID must be a positive integer')
      .toInt(),
    
    handleValidationErrors
  ],
  
  // List projects
  list: [
    commonRules.page,
    commonRules.limit,
    
    query('status')
      .optional()
      .isIn(['Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold'])
      .withMessage('Invalid status value'),
    
    query('project_type_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Project type ID must be a positive integer')
      .toInt(),
    
    query('province_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Province ID must be a positive integer')
      .toInt(),
    
    query('municipality_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Municipality ID must be a positive integer')
      .toInt(),
    
    query('barangay_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Barangay ID must be a positive integer')
      .toInt(),
    
    query('date_from')
      .optional()
      .isISO8601()
      .withMessage('Date from must be a valid date (YYYY-MM-DD)'),
    
    query('date_to')
      .optional()
      .isISO8601()
      .withMessage('Date to must be a valid date (YYYY-MM-DD)'),
    
    query('search')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters'),
    
    handleValidationErrors
  ]
};

/**
 * Geospatial validation rules
 */
const geospatialValidation = {
  // Find nearby projects
  nearby: [
    query('lat')
      .notEmpty()
      .withMessage('Latitude (lat) is required')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    
    query('lng')
      .notEmpty()
      .withMessage('Longitude (lng) is required')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    
    query('radius')
      .optional()
      .isFloat({ min: 0.1, max: 500 })
      .withMessage('Radius must be between 0.1 and 500 kilometers')
      .toFloat(),
    
    commonRules.page,
    commonRules.limit,
    
    handleValidationErrors
  ],
  
  // Bounding box search
  boundingBox: [
    body('north')
      .notEmpty()
      .withMessage('North boundary is required')
      .isFloat({ min: -90, max: 90 })
      .withMessage('North must be a valid latitude'),
    
    body('south')
      .notEmpty()
      .withMessage('South boundary is required')
      .isFloat({ min: -90, max: 90 })
      .withMessage('South must be a valid latitude'),
    
    body('east')
      .notEmpty()
      .withMessage('East boundary is required')
      .isFloat({ min: -180, max: 180 })
      .withMessage('East must be a valid longitude'),
    
    body('west')
      .notEmpty()
      .withMessage('West boundary is required')
      .isFloat({ min: -180, max: 180 })
      .withMessage('West must be a valid longitude'),
    
    body('filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object'),
    
    handleValidationErrors
  ]
};

/**
 * Reference data validation rules
 */
const referenceValidation = {
  // Get municipalities by province
  municipalities: [
    query('province_id')
      .notEmpty()
      .withMessage('Province ID is required')
      .isInt({ min: 1 })
      .withMessage('Province ID must be a positive integer')
      .toInt(),
    handleValidationErrors
  ],
  
  // Get barangays by municipality
  barangays: [
    query('municipality_id')
      .notEmpty()
      .withMessage('Municipality ID is required')
      .isInt({ min: 1 })
      .withMessage('Municipality ID must be a positive integer')
      .toInt(),
    handleValidationErrors
  ]
};

/**
 * Report validation rules
 */
const reportValidation = {
  // Date range reports
  dateRange: [
    query('date_from')
      .optional()
      .isISO8601()
      .withMessage('Date from must be a valid date (YYYY-MM-DD)'),
    
    query('date_to')
      .optional()
      .isISO8601()
      .withMessage('Date to must be a valid date (YYYY-MM-DD)'),
    
    handleValidationErrors
  ]
};

module.exports = {
  handleValidationErrors,
  commonRules,
  projectValidation,
  geospatialValidation,
  referenceValidation,
  reportValidation
};
