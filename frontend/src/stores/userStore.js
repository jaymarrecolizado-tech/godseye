import { create } from 'zustand'
import { usersApi } from '@/services/api'

/**
 * User Management Store
 * Manages user-related state and operations for admin user management
 */
export const useUserStore = create((set, get) => ({
  // State
  users: [],
  selectedUser: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  successMessage: null,

  // Filters and Pagination
  filters: {
    search: '',
    role: '',
    status: ''
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  },
  sortConfig: {
    sortBy: 'created_at',
    sortOrder: 'desc'
  },

  // Available roles
  roles: [
    { value: 'Admin', label: 'Admin' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Editor', label: 'Editor' },
    { value: 'Viewer', label: 'Viewer' }
  ],

  // Actions

  // Set filters
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 } // Reset to page 1 when filters change
    }))
  },

  // Clear filters
  clearFilters: () => {
    set({
      filters: {
        search: '',
        role: '',
        status: ''
      },
      pagination: { ...get().pagination, page: 1 }
    })
  },

  // Set sorting
  setSortConfig: (sortBy, sortOrder) => {
    set({ sortConfig: { sortBy, sortOrder } })
  },

  // Set page
  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page }
    }))
  },

  // Clear messages
  clearMessages: () => {
    set({ error: null, successMessage: null })
  },

  // Fetch all users
  fetchUsers: async () => {
    set({ isLoading: true, error: null })

    try {
      const { filters, pagination, sortConfig } = get()

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        role: filters.role,
        status: filters.status,
        sortBy: sortConfig.sortBy,
        sortOrder: sortConfig.sortOrder
      }

      const response = await usersApi.getUsers(params)

      // Note: axios interceptor returns response.data directly
      if (response.success) {
        set({
          users: response.data.users,
          pagination: response.data.pagination,
          isLoading: false
        })
      } else {
        throw new Error(response.message || 'Failed to fetch users')
      }
    } catch (error) {
      const errorMessage = error.response?.message || error.message || 'Failed to fetch users'
      set({
        isLoading: false,
        error: errorMessage
      })
    }
  },

  // Get user by ID
  fetchUserById: async (id) => {
    set({ isLoading: true, error: null, selectedUser: null })

    try {
      const response = await usersApi.getUser(id)

      if (response.success) {
        set({
          selectedUser: response.data,
          isLoading: false
        })
        return response.data
      } else {
        throw new Error(response.message || 'Failed to fetch user')
      }
    } catch (error) {
      const errorMessage = error.response?.message || error.message || 'Failed to fetch user'
      set({
        isLoading: false,
        error: errorMessage
      })
      return null
    }
  },

  // Create new user
  createUser: async (userData) => {
    set({ isSubmitting: true, error: null, successMessage: null })

    try {
      const response = await usersApi.createUser(userData)

      if (response.success) {
        set({
          isSubmitting: false,
          successMessage: response.data.message || 'User created successfully'
        })
        // Refresh user list
        get().fetchUsers()
        return { success: true, data: response.data }
      } else {
        throw new Error(response.message || 'Failed to create user')
      }
    } catch (error) {
      const errorMessage = error.response?.message || error.message || 'Failed to create user'
      set({
        isSubmitting: false,
        error: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  },

  // Update user
  updateUser: async (id, userData) => {
    set({ isSubmitting: true, error: null, successMessage: null })

    try {
      const response = await usersApi.updateUser(id, userData)

      if (response.success) {
        set({
          isSubmitting: false,
          successMessage: 'User updated successfully'
        })
        // Refresh user list
        get().fetchUsers()
        return { success: true, data: response.data }
      } else {
        throw new Error(response.message || 'Failed to update user')
      }
    } catch (error) {
      const errorMessage = error.response?.message || error.message || 'Failed to update user'
      set({
        isSubmitting: false,
        error: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  },

  // Update user role
  updateUserRole: async (id, role) => {
    set({ isSubmitting: true, error: null, successMessage: null })

    try {
      const response = await usersApi.updateUserRole(id, role)

      if (response.success) {
        set({
          isSubmitting: false,
          successMessage: 'User role updated successfully'
        })
        // Refresh user list
        get().fetchUsers()
        return { success: true }
      } else {
        throw new Error(response.message || 'Failed to update user role')
      }
    } catch (error) {
      const errorMessage = error.response?.message || error.message || 'Failed to update user role'
      set({
        isSubmitting: false,
        error: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  },

  // Update user status
  updateUserStatus: async (id, isActive) => {
    set({ isSubmitting: true, error: null, successMessage: null })

    try {
      const response = await usersApi.updateUserStatus(id, isActive)

      if (response.success) {
        set({
          isSubmitting: false,
          successMessage: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        })
        // Refresh user list
        get().fetchUsers()
        return { success: true }
      } else {
        throw new Error(response.message || 'Failed to update user status')
      }
    } catch (error) {
      const errorMessage = error.response?.message || error.message || 'Failed to update user status'
      set({
        isSubmitting: false,
        error: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  },

  // Delete user
  deleteUser: async (id) => {
    set({ isSubmitting: true, error: null, successMessage: null })

    try {
      const response = await usersApi.deleteUser(id)

      if (response.success) {
        set({
          isSubmitting: false,
          successMessage: 'User deleted successfully'
        })
        // Refresh user list
        get().fetchUsers()
        return { success: true }
      } else {
        throw new Error(response.message || 'Failed to delete user')
      }
    } catch (error) {
      const errorMessage = error.response?.message || error.message || 'Failed to delete user'
      set({
        isSubmitting: false,
        error: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  },

  // Reset user password
  resetPassword: async (id) => {
    set({ isSubmitting: true, error: null, successMessage: null })

    try {
      const response = await usersApi.resetPassword(id)

      if (response.success) {
        set({
          isSubmitting: false,
          successMessage: `Password reset successfully. New password: ${response.data.newPassword}`
        })
        return { success: true, newPassword: response.data.newPassword }
      } else {
        throw new Error(response.message || 'Failed to reset password')
      }
    } catch (error) {
      const errorMessage = error.response?.message || error.message || 'Failed to reset password'
      set({
        isSubmitting: false,
        error: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  }
}))

export default useUserStore
