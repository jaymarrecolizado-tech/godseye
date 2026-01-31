import { create } from 'zustand'
import { api } from '@/services/api'
import { useAuthStore } from './authStore'

// Socket instance (outside store to persist across re-renders)
let socket = null

export const useProjectStore = create((set, get) => ({
  // State
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  socketConnected: false,
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

  // Socket connection management
  initializeSocket: async () => {
    // Don't initialize if already connected
    if (socket?.connected) return

    // Get auth token
    const token = useAuthStore.getState().getAccessToken()
    if (!token) return

    try {
      const { io } = await import('socket.io-client')
      const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'

      socket = io(API_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      socket.on('connect', () => {
        console.log('Project socket connected')
        set({ socketConnected: true })
        // Join projects room for broadcasts
        socket.emit('join:projects')
      })

      socket.on('disconnect', (reason) => {
        console.log('Project socket disconnected:', reason)
        set({ socketConnected: false })
      })

      socket.on('connect_error', (error) => {
        console.error('Project socket connection error:', error)
        set({ socketConnected: false })
      })

      // Listen for project events
      socket.on('project:created', (project) => {
        console.log('Project created event received:', project)
        const { projects, pagination } = get()
        
        // Add new project to the beginning of the list
        set({
          projects: [project, ...projects],
          pagination: {
            ...pagination,
            total: pagination.total + 1,
            totalPages: Math.ceil((pagination.total + 1) / pagination.limit)
          }
        })
      })

      socket.on('project:updated', (project) => {
        console.log('Project updated event received:', project)
        const { projects, currentProject } = get()
        
        // Update project in the list
        const updatedProjects = projects.map(p => 
          p.id === project.id ? { ...p, ...project } : p
        )
        
        set({ 
          projects: updatedProjects,
          // Update currentProject if it's the one being updated
          currentProject: currentProject?.id === project.id 
            ? { ...currentProject, ...project } 
            : currentProject
        })
      })

      socket.on('project:deleted', (projectId) => {
        console.log('Project deleted event received:', projectId)
        const { projects, pagination, currentProject } = get()
        
        // Remove project from the list
        const filteredProjects = projects.filter(p => p.id !== projectId)
        
        set({ 
          projects: filteredProjects,
          pagination: {
            ...pagination,
            total: Math.max(0, pagination.total - 1),
            totalPages: Math.max(1, Math.ceil((pagination.total - 1) / pagination.limit))
          },
          // Clear currentProject if it's the one being deleted
          currentProject: currentProject?.id === projectId ? null : currentProject
        })
      })

    } catch (err) {
      console.error('Failed to initialize socket:', err)
    }
  },

  disconnectSocket: () => {
    if (socket) {
      socket.disconnect()
      socket = null
      set({ socketConnected: false })
      console.log('Project socket disconnected manually')
    }
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
      // Note: Real-time update will come via socket 'project:created' event
      // But we also refresh to ensure consistency
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
      // Note: Real-time update will come via socket 'project:updated' event
      // But we also refresh to ensure consistency
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
      // Note: Real-time update will come via socket 'project:deleted' event
      // But we also refresh to ensure consistency
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

// Subscribe to auth state changes to manage socket connection
let unsubscribeAuth = null

export const subscribeToAuthChanges = () => {
  // Only subscribe once
  if (unsubscribeAuth) return

  unsubscribeAuth = useAuthStore.subscribe(
    (state) => ({ isAuthenticated: state.isAuthenticated, token: state.accessToken }),
    (auth) => {
      const projectStore = useProjectStore.getState()
      
      if (auth.isAuthenticated && auth.token) {
        // User logged in, initialize socket
        projectStore.initializeSocket()
      } else {
        // User logged out, disconnect socket
        projectStore.disconnectSocket()
      }
    }
  )

  // Check initial auth state
  const authState = useAuthStore.getState()
  if (authState.isAuthenticated && authState.accessToken) {
    useProjectStore.getState().initializeSocket()
  }
}

// Initialize subscription when this module is imported
subscribeToAuthChanges()
