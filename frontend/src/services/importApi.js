/**
 * Import API Service
 * Handles CSV import operations
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Storage keys (must match authStore)
const ACCESS_TOKEN_KEY = 'access_token'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - add auth token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Upload CSV file for import
 * @param {File} file - CSV file to upload
 * @param {Object} options - Import options
 * @returns {Promise} Upload result with importId
 */
export const uploadCSV = async (file, options = {}) => {
  const formData = new FormData()
  formData.append('file', file)
  
  // Add options
  if (options.skipDuplicates !== undefined) {
    formData.append('skipDuplicates', options.skipDuplicates)
  }
  if (options.updateExisting !== undefined) {
    formData.append('updateExisting', options.updateExisting)
  }

  const response = await apiClient.post('/import/csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

/**
 * Get import status and progress
 * @param {number} importId - Import job ID
 * @returns {Promise} Import status
 */
export const getImportStatus = async (importId) => {
  const response = await apiClient.get(`/import/${importId}/status`)
  return response.data
}

/**
 * Download error report CSV
 * @param {number} importId - Import job ID
 * @returns {Promise<Blob>} Error report CSV file
 */
export const downloadErrorReport = async (importId) => {
  const response = await apiClient.get(`/import/${importId}/download`, {
    responseType: 'blob'
  })
  return response.data
}

/**
 * Get list of recent imports
 * @param {Object} params - Query params (page, limit)
 * @returns {Promise} List of imports
 */
export const getImportHistory = async (params = {}) => {
  const response = await apiClient.get('/import', { params })
  return response.data
}

/**
 * Delete import job
 * @param {number} importId - Import job ID
 * @returns {Promise} Delete result
 */
export const deleteImport = async (importId) => {
  const response = await apiClient.delete(`/import/${importId}`)
  return response.data
}

// Export all methods
export const importApi = {
  uploadCSV,
  getImportStatus,
  downloadErrorReport,
  getImportHistory,
  deleteImport
}

export default importApi
