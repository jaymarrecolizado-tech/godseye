/**
 * Response Utilities
 * Standardized API response formatting
 */

/**
 * Create a success response
 * @param {Object} options - Response options
 * @param {*} options.data - The response data
 * @param {string} [options.message='Success'] - Success message
 * @param {Object} [options.meta] - Additional metadata (pagination, counts, etc.)
 * @returns {Object} Standardized success response
 */
const success = (options = {}) => {
  const { data, message = 'Success', meta = null } = options;
  
  const response = {
    success: true,
    message,
    data: data !== undefined ? data : null
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
};

/**
 * Create a paginated response
 * @param {Array} data - The paginated data
 * @param {Object} pagination - Pagination info
 * @param {number} pagination.page - Current page
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total items
 * @param {string} [message='Success'] - Success message
 * @returns {Object} Standardized paginated response
 */
const paginated = (data, pagination, message = 'Success') => {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    message,
    data,
    meta: {
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(total, 10),
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  };
};

/**
 * Create an error response
 * @param {Object} options - Error options
 * @param {string} options.error - Error title/name
 * @param {string} options.message - Detailed error message
 * @param {Array} [options.details] - Validation error details
 * @param {number} [options.statusCode=400] - HTTP status code
 * @returns {Object} Standardized error response
 */
const error = (options = {}) => {
  const { 
    error: errorTitle = 'Error', 
    message = 'An error occurred', 
    details = null,
    statusCode = 400 
  } = options;
  
  const response = {
    success: false,
    error: errorTitle,
    message,
    statusCode
  };
  
  if (details && details.length > 0) {
    response.details = details;
  }
  
  return response;
};

/**
 * Create a validation error response
 * @param {Array} errors - Array of validation errors from express-validator
 * @returns {Object} Standardized validation error response
 */
const validationError = (errors) => {
  const details = errors.map(err => ({
    field: err.path || err.param,
    message: err.msg,
    value: err.value
  }));
  
  return {
    success: false,
    error: 'Validation Error',
    message: 'One or more fields failed validation',
    details
  };
};

/**
 * Send response with appropriate status code
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {number} [statusCode=200] - HTTP status code
 */
const send = (res, data, statusCode = 200) => {
  return res.status(statusCode).json(data);
};

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} [message='Success'] - Success message
 * @param {number} [statusCode=200] - HTTP status code
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json(success({ data, message }));
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} error - Error title
 * @param {string} message - Error message
 * @param {number} [statusCode=400] - HTTP status code
 * @param {Array} [details] - Error details
 */
const sendError = (res, error, message, statusCode = 400, details = null) => {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
    ...(details && { details })
  });
};

/**
 * Common HTTP status codes
 */
const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  LOCKED: 423,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Common error messages
 */
const ERROR_MESSAGES = {
  NOT_FOUND: 'The requested resource was not found',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'You do not have permission to access this resource',
  VALIDATION_FAILED: 'Validation failed for the request',
  INTERNAL_ERROR: 'An internal server error occurred',
  BAD_REQUEST: 'The request could not be processed',
  CONFLICT: 'A conflict occurred with the current state of the resource'
};

module.exports = {
  success,
  paginated,
  error,
  validationError,
  send,
  sendSuccess,
  sendError,
  STATUS_CODES,
  ERROR_MESSAGES
};
