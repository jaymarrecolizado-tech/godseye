import { create } from 'zustand'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Storage keys
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user'

// Create axios instance for auth requests (to avoid circular dependency)
const authApiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,

  // Initialize auth state from localStorage
  initializeAuth: () => {
    try {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      const user = localStorage.getItem(USER_KEY)

      if (accessToken && refreshToken && user) {
        set({
          accessToken,
          refreshToken,
          user: JSON.parse(user),
          isAuthenticated: true,
          isInitializing: false
        })
      } else {
        set({ isInitializing: false })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      // Clear invalid storage
      get().clearStorage()
      set({ isInitializing: false })
    }
  },

  // Login action
  login: async (username, password) => {
    set({ isLoading: true, error: null })

    try {
      const response = await authApiClient.post('/auth/login', {
        username,
        password
      })

      const { accessToken, refreshToken, user } = response.data.data

      // Store in localStorage
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      localStorage.setItem(USER_KEY, JSON.stringify(user))

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })

      return { success: true, user }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.'
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false
      })
      return { success: false, error: errorMessage }
    }
  },

  // Logout action
  logout: async () => {
    const { refreshToken } = get()

    try {
      // Call logout endpoint if refresh token exists
      if (refreshToken) {
        await authApiClient.post('/auth/logout', { refreshToken })
      }
    } catch (error) {
      console.error('Logout API error:', error)
      // Continue with local logout even if API call fails
    } finally {
      // Clear all auth data
      get().clearStorage()
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null
      })
    }
  },

  // Refresh token action
  refreshAccessToken: async () => {
    const { refreshToken } = get()

    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await authApiClient.post('/auth/refresh', {
        refreshToken
      })

      const { accessToken } = response.data.data

      // Update localStorage
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)

      set({
        accessToken,
        isAuthenticated: true
      })

      return accessToken
    } catch (error) {
      // Refresh failed - clear auth state
      get().clearStorage()
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false
      })
      throw error
    }
  },

  // Check auth status (validate token)
  checkAuth: async () => {
    const { accessToken } = get()

    if (!accessToken) {
      return false
    }

    try {
      const response = await authApiClient.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      const userData = response.data.data

      // Update user data
      localStorage.setItem(USER_KEY, JSON.stringify(userData))
      set({ user: userData })

      return true
    } catch (error) {
      // Token might be expired, try to refresh
      if (error.response?.status === 401) {
        try {
          await get().refreshAccessToken()
          return true
        } catch (refreshError) {
          return false
        }
      }
      return false
    }
  },

  // Update tokens (used by API interceptor)
  setTokens: (accessToken, refreshToken = null) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
    set({
      accessToken,
      ...(refreshToken && { refreshToken }),
      isAuthenticated: true
    })
  },

  // Get access token (for API interceptor)
  getAccessToken: () => {
    return get().accessToken || localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  // Get refresh token (for API interceptor)
  getRefreshToken: () => {
    return get().refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  // Clear storage helper
  clearStorage: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  }
}))

// Initialize auth on import
useAuthStore.getState().initializeAuth()

export default useAuthStore
