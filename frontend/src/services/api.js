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
    return apiClient.get('/geospatial/map-data', { params })
  },

  // Get projects within bounds
  getProjectsInBounds: (bounds) => {
    return apiClient.get('/geospatial/bounds', { params: bounds })
  },

  // Get projects near a point
  getNearbyProjects: (latitude, longitude, radius = 10) => {
    return apiClient.get('/geospatial/nearby', {
      params: { latitude, longitude, radius }
    })
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

  // Get all project types
  getProjectTypes: () => {
    return apiClient.get('/reference/project-types')
  }
}

// Reports API
export const reportsApi = {
  // Get dashboard statistics
  getStats: () => {
    return apiClient.get('/reports/stats')
  },

  // Get summary by project type
  getSummaryByType: () => {
    return apiClient.get('/reports/summary/type')
  },

  // Get summary by status
  getSummaryByStatus: () => {
    return apiClient.get('/reports/summary/status')
  },

  // Get summary by province
  getSummaryByProvince: () => {
    return apiClient.get('/reports/summary/province')
  },

  // Get monthly trend
  getMonthlyTrend: () => {
    return apiClient.get('/reports/trend/monthly')
  },

  // Export reports
  exportReport: (format = 'csv') => {
    return apiClient.get(`/reports/export?format=${format}`, {
      responseType: 'blob'
    })
  }
}

// Import API
export { importApi }

// Export all APIs
export const api = {
  ...projectsApi,
  ...geospatialApi,
  ...referenceApi,
  ...reportsApi,
  ...importApi
}

// Export the axios instance for advanced use cases
export { apiClient }

export default apiClient
