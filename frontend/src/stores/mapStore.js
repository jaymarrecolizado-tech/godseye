import { create } from 'zustand'
import { api } from '@/services/api'

export const useMapStore = create((set, get) => ({
  // State
  markers: [],
  selectedMarker: null,
  mapBounds: null,
  visibleProjects: [],
  loading: false,
  error: null,
  districtBounds: null,
  filters: {
    projectType: '',
    status: '',
    province: '',
    municipality: '',
    district: ''
  },

  // Actions
  fetchMapData: async (filters = {}) => {
    set({ loading: true, error: null })
    try {
      const params = {
        ...(filters.projectType && { project_type_id: filters.projectType }),
        ...(filters.status && { status: filters.status }),
        ...(filters.province && { province_id: filters.province }),
        ...(filters.municipality && { municipality_id: filters.municipality }),
        ...(filters.district && { district_id: filters.district })
      }

      const response = await api.getMapData(params)
      // Handle GeoJSON format - extract features array
      const features = response.data?.features || []
      const bounds = response.data?.metadata?.bounds || null
      
      set({
        markers: features,
        visibleProjects: features,
        districtBounds: bounds,
        loading: false
      })
      
      return { features, bounds }
    } catch (error) {
      set({ 
        error: error.message || 'Failed to fetch map data', 
        loading: false 
      })
      throw error
    }
  },

  // Fetch district bounds
  fetchDistrictBounds: async (districtId) => {
    if (!districtId) {
      set({ districtBounds: null })
      return null
    }
    
    try {
      const response = await api.getDistrictBounds(districtId)
      const bounds = response.data?.bounds || null
      set({ districtBounds: bounds })
      return bounds
    } catch (error) {
      console.error('Error fetching district bounds:', error)
      set({ districtBounds: null })
      return null
    }
  },

  // Fetch projects in district
  fetchProjectsInDistrict: async (districtId, filters = {}) => {
    set({ loading: true, error: null })
    try {
      const params = {
        ...(filters.status && { status: filters.status }),
        ...(filters.projectType && { project_type_id: filters.projectType })
      }

      const response = await api.getProjectsInDistrict(districtId, params)
      const features = response.data?.features || []
      const bounds = response.data?.metadata?.bounds || null
      
      set({
        markers: features,
        visibleProjects: features,
        districtBounds: bounds,
        loading: false
      })
      
      return { features, bounds }
    } catch (error) {
      set({ 
        error: error.message || 'Failed to fetch district projects', 
        loading: false 
      })
      throw error
    }
  },

  fetchProjectsInBounds: async (bounds) => {
    if (!bounds) return
    
    set({ loading: true })
    try {
      const response = await api.getProjectsInBounds({
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west
      })
      set({
        visibleProjects: response.data || [],
        loading: false
      })
    } catch (error) {
      set({ 
        error: error.message || 'Failed to fetch projects in bounds', 
        loading: false 
      })
    }
  },

  setMapBounds: (bounds) => {
    set({ mapBounds: bounds })
    // Optionally fetch projects within bounds
    // get().fetchProjectsInBounds(bounds)
  },

  selectMarker: (marker) => {
    set({ selectedMarker: marker })
  },

  clearSelectedMarker: () => {
    set({ selectedMarker: null })
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }))
    // Refresh map data with new filters
    const updatedFilters = { ...get().filters, ...newFilters }
    get().fetchMapData(updatedFilters)
  },

  clearFilters: () => {
    set({
      filters: {
        projectType: '',
        status: '',
        province: '',
        municipality: '',
        district: ''
      },
      districtBounds: null
    })
    get().fetchMapData()
  },

  clearDistrictBounds: () => {
    set({ districtBounds: null })
  },

  // Get markers grouped by project type
  getMarkersByType: () => {
    const { markers } = get()
    return markers.reduce((acc, marker) => {
      const type = marker.project_type || 'Unknown'
      if (!acc[type]) acc[type] = []
      acc[type].push(marker)
      return acc
    }, {})
  },

  // Get markers filtered by type
  getFilteredMarkers: (typeFilter) => {
    const { markers } = get()
    if (!typeFilter) return markers
    return markers.filter(marker => 
      marker.project_type?.toLowerCase() === typeFilter.toLowerCase()
    )
  },

  // Get statistics for visible markers
  getMapStats: () => {
    const { markers } = get()
    return {
      total: markers.length,
      byType: markers.reduce((acc, marker) => {
        const type = marker.project_type || 'Unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {}),
      byStatus: markers.reduce((acc, marker) => {
        const status = marker.status || 'Unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))
