import { create } from 'zustand'
import { api } from '@/services/api'

export const useProjectStore = create((set, get) => ({
  // State
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  filters: {
    search: '',
    status: [],
    projectType: '',
    province: '',
    municipality: '',
    dateFrom: '',
    dateTo: ''
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  },

  // Actions
  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const { filters, pagination } = get()
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.status.length > 0 && { status: filters.status.join(',') }),
        ...(filters.projectType && { project_type: filters.projectType }),
        ...(filters.province && { province_id: filters.province }),
        ...(filters.municipality && { municipality_id: filters.municipality }),
        ...(filters.dateFrom && { date_from: filters.dateFrom }),
        ...(filters.dateTo && { date_to: filters.dateTo })
      }

      const response = await api.getProjects(params)
      set({
        projects: response.data || [],
        pagination: {
          ...pagination,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 1
        },
        loading: false
      })
    } catch (error) {
      set({ 
        error: error.message || 'Failed to fetch projects', 
        loading: false 
      })
    }
  },

  fetchProject: async (id) => {
    set({ loading: true, error: null })
    try {
      const response = await api.getProject(id)
      set({ 
        currentProject: response.data,
        loading: false 
      })
      return response.data
    } catch (error) {
      set({ 
        error: error.message || 'Failed to fetch project', 
        loading: false 
      })
      throw error
    }
  },

  createProject: async (data) => {
    set({ loading: true, error: null })
    try {
      const response = await api.createProject(data)
      set({ loading: false })
      // Refresh projects list
      get().fetchProjects()
      return response.data
    } catch (error) {
      set({ 
        error: error.message || 'Failed to create project', 
        loading: false 
      })
      throw error
    }
  },

  updateProject: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const response = await api.updateProject(id, data)
      set({ 
        currentProject: response.data,
        loading: false 
      })
      // Refresh projects list
      get().fetchProjects()
      return response.data
    } catch (error) {
      set({ 
        error: error.message || 'Failed to update project', 
        loading: false 
      })
      throw error
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.deleteProject(id)
      set({ 
        currentProject: null,
        loading: false 
      })
      // Refresh projects list
      get().fetchProjects()
    } catch (error) {
      set({ 
        error: error.message || 'Failed to delete project', 
        loading: false 
      })
      throw error
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 } // Reset to first page when filters change
    }))
    // Fetch projects with new filters
    get().fetchProjects()
  },

  setPagination: (newPagination) => {
    set((state) => ({
      pagination: { ...state.pagination, ...newPagination }
    }))
    // Fetch projects with new pagination
    get().fetchProjects()
  },

  clearFilters: () => {
    set({
      filters: {
        search: '',
        status: [],
        projectType: '',
        province: '',
        municipality: '',
        dateFrom: '',
        dateTo: ''
      },
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
      }
    })
    get().fetchProjects()
  },

  clearError: () => {
    set({ error: null })
  }
}))
