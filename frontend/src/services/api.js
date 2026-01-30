import axios from 'axios'
import { importApi } from './importApi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
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

export default apiClient
