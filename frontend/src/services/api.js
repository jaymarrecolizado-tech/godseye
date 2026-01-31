import axios from 'axios'
import { importApi } from './importApi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Storage keys (must match authStore)
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

// Token refresh state
let isRefreshing = false
let refreshSubscribers = []

// Subscribe to token refresh
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback)
}

// Notify all subscribers with new token
const onTokenRefreshed = (newToken) => {
  refreshSubscribers.forEach(callback => callback(newToken))
  refreshSubscribers = []
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Helper to get access token
const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)

// Helper to get refresh token
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)

// Helper to set access token
const setAccessToken = (token) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

// Helper to clear all auth data
const clearAuthData = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem('user')
}

// Helper to refresh token
const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken()
  
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken
    })

    const { accessToken } = response.data.data
    setAccessToken(accessToken)
    
    return accessToken
  } catch (error) {
    clearAuthData()
    throw error
  }
}

// Request interceptor - add auth token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config

    // If error is not 401 or request already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // If already refreshing, queue the request
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          resolve(apiClient(originalRequest))
        })
      })
    }

    // Start token refresh
    originalRequest._retry = true
    isRefreshing = true

    try {
      const newToken = await refreshAccessToken()
      
      // Update authorization header
      apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      
      // Notify all queued requests
      onTokenRefreshed(newToken)
      
      // Retry original request
      return apiClient(originalRequest)
    } catch (refreshError) {
      // Token refresh failed - redirect to login
      clearAuthData()
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

// Projects API
export const projectsApi = {
  // Get all projects with filters and pagination
  getProjects: (params = {}) => {
    return apiClient.get('/projects', { params })
  },

  // Get single project
  getProject: (id) => {
    return apiClient.get(`/projects/${id}`)
  },

  // Get project status history
  getProjectHistory: (id) => {
    return apiClient.get(`/projects/${id}/history`)
  },

  // Create new project
  createProject: (data) => {
    return apiClient.post('/projects', data)
  },

  // Update project
  updateProject: (id, data) => {
    return apiClient.put(`/projects/${id}`, data)
  },

  // Delete project
  deleteProject: (id) => {
    return apiClient.delete(`/projects/${id}`)
  },

  // Import projects from CSV
  importProjects: (formData) => {
    return apiClient.post('/projects/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

// Geospatial API
export const geospatialApi = {
  // Get map data with filters
  getMapData: (params = {}) => {
    return apiClient.get('/map-data', { params })
  },

  // Get clusters for map
  getClusters: (params = {}) => {
    return apiClient.get('/clusters', { params })
  },

  // Get projects within bounds
  getProjectsInBounds: (bounds) => {
    return apiClient.get('/bounding-box', { params: bounds })
  },

  // Get projects near a point
  getNearbyProjects: (latitude, longitude, radius = 10) => {
    return apiClient.get('/nearby', {
      params: { latitude, longitude, radius }
    })
  },

  // Get boundary data
  getBoundary: (type, id) => {
    return apiClient.get(`/boundary/${type}/${id}`)
  }
}

// Reference Data API
export const referenceApi = {
  // Get all provinces
  getProvinces: () => {
    return apiClient.get('/reference/provinces')
  },

  // Get municipalities by province
  getMunicipalities: (provinceId) => {
    return apiClient.get('/reference/municipalities', {
      params: { province_id: provinceId }
    })
  },

  // Get barangays by municipality
  getBarangays: (municipalityId) => {
    return apiClient.get('/reference/barangays', {
      params: { municipality_id: municipalityId }
    })
  },

  // Get districts by province
  getDistricts: (provinceId) => {
    return apiClient.get('/reference/districts', {
      params: { province_id: provinceId }
    })
  },

  // Get all project types
  getProjectTypes: () => {
    return apiClient.get('/reference/project-types')
  }
}

// Reports API
export const reportsApi = {
  // Get dashboard summary
  getStats: (params = {}) => {
    return apiClient.get('/reports/summary', { params })
  },

  // Get summary by project type
  getSummaryByType: (params = {}) => {
    return apiClient.get('/reports/by-project-type', { params })
  },

  // Get summary by status
  getSummaryByStatus: (params = {}) => {
    return apiClient.get('/reports/by-status', { params })
  },

  // Get summary by location (province)
  getSummaryByProvince: (params = {}) => {
    return apiClient.get('/reports/by-location', { params })
  },

  // Get timeline data (monthly trends)
  getMonthlyTrend: (params = {}) => {
    return apiClient.get('/reports/timeline', { params })
  },

  // Get performance metrics
  getPerformance: (params = {}) => {
    return apiClient.get('/reports/performance', { params })
  },

  // Get custom report with filters and grouping
  getCustomReport: (params = {}) => {
    return apiClient.get('/reports/custom', { params })
  },

  // Export reports as CSV
  exportCSV: (params = {}) => {
    return apiClient.get('/reports/export/csv', {
      params,
      responseType: 'blob'
    })
  },

  // Export reports as Excel
  exportExcel: (params = {}) => {
    return apiClient.get('/reports/export/excel', {
      params,
      responseType: 'blob'
    })
  },

  // Export summary report as PDF
  exportSummaryPDF: (params = {}) => {
    return apiClient.get('/reports/export/pdf/summary', {
      params,
      responseType: 'blob'
    })
  },

  // Export status report as PDF
  exportStatusPDF: (params = {}) => {
    return apiClient.get('/reports/export/pdf/status', {
      params,
      responseType: 'blob'
    })
  },

  // Export location report as PDF
  exportLocationPDF: (params = {}) => {
    return apiClient.get('/reports/export/pdf/location', {
      params,
      responseType: 'blob'
    })
  },

  // Export projects list as PDF
  exportProjectsPDF: (params = {}) => {
    return apiClient.get('/reports/export/pdf/projects', {
      params,
      responseType: 'blob'
    })
  },

  // Export custom grouped report as PDF
  exportCustomReportPDF: (params = {}) => {
    return apiClient.get('/reports/export/pdf/custom', {
      params,
      responseType: 'blob'
    })
  }
}

// Import API
export { importApi }

// Audit Logs API
export const auditApi = {
  // Get audit logs with filters and pagination
  getAuditLogs: (params = {}) => {
    return apiClient.get('/audit-logs', { params })
  },

  // Get audit log statistics
  getAuditStats: (params = {}) => {
    return apiClient.get('/audit-logs/stats', { params })
  },

  // Get distinct entity types for filters
  getEntityTypes: () => {
    return apiClient.get('/audit-logs/entity-types')
  },

  // Get single audit log by ID
  getAuditLog: (id) => {
    return apiClient.get(`/audit-logs/${id}`)
  }
}

// Users API
export const usersApi = {
  // Get all users with filters and pagination
  getUsers: (params = {}) => {
    return apiClient.get('/users', { params })
  },

  // Get single user by ID
  getUser: (id) => {
    return apiClient.get(`/users/${id}`)
  },

  // Create new user
  createUser: (data) => {
    return apiClient.post('/users', data)
  },

  // Update user
  updateUser: (id, data) => {
    return apiClient.put(`/users/${id}`, data)
  },

  // Update user role
  updateUserRole: (id, role) => {
    return apiClient.put(`/users/${id}/role`, { role })
  },

  // Update user status (activate/deactivate)
  updateUserStatus: (id, isActive) => {
    return apiClient.put(`/users/${id}/status`, { isActive })
  },

  // Delete user
  deleteUser: (id) => {
    return apiClient.delete(`/users/${id}`)
  },

  // Reset user password
  resetPassword: (id) => {
    return apiClient.post(`/users/${id}/reset-password`)
  },

  // Get available roles
  getUserRoles: () => {
    return apiClient.get('/users/roles')
  }
}

// Notifications API
export const notificationsApi = {
  // Get user's notifications
  getNotifications: (params = {}) => {
    return apiClient.get('/notifications', { params })
  },

  // Get unread notification count
  getUnreadCount: () => {
    return apiClient.get('/notifications/unread-count')
  },

  // Mark a notification as read
  markAsRead: (id) => {
    return apiClient.put(`/notifications/${id}/read`)
  },

  // Mark all notifications as read
  markAllAsRead: () => {
    return apiClient.put('/notifications/read-all')
  },

  // Delete a notification
  deleteNotification: (id) => {
    return apiClient.delete(`/notifications/${id}`)
  },

  // Delete all read notifications
  deleteReadNotifications: () => {
    return apiClient.delete('/notifications/read-all')
  },

  // Create test notification (admin only)
  createTestNotification: (data = {}) => {
    return apiClient.post('/notifications/test', data)
  }
}

// Export all APIs
export const api = {
  ...projectsApi,
  ...geospatialApi,
  ...referenceApi,
  ...reportsApi,
  ...importApi,
  ...auditApi,
  ...usersApi,
  ...notificationsApi
}

// Export the axios instance for advanced use cases
export { apiClient }

export default apiClient
