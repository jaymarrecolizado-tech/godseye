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
  filters: {
    projectType: '',
    status: '',
    province: ''
  },

  // Actions
  fetchMapData: async (filters = {}) => {
    set({ loading: true, error: null })
    try {
      const params = {
        ...(filters.projectType && { project_type: filters.projectType }),
        ...(filters.status && { status: filters.status }),
        ...(filters.province && { province_id: filters.province })
      }

      const response = await api.getMapData(params)
      set({
        markers: response.data || [],
        visibleProjects: response.data || [],
        loading: false
      })
    } catch (error) {
      set({ 
        error: error.message || 'Failed to fetch map data', 
        loading: false 
      })
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
    get().fetchMapData(get().filters)
  },

  clearFilters: () => {
    set({
      filters: {
        projectType: '',
        status: '',
        province: ''
      }
    })
    get().fetchMapData()
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
