import { create } from 'zustand'
import { io } from 'socket.io-client'
import apiClient from '@/services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Storage key for caching notifications
const NOTIFICATIONS_CACHE_KEY = 'notifications_cache'

export const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,
  socket: null,
  isConnected: false,

  // Initialize notifications from cache and fetch fresh data
  initializeNotifications: async () => {
    // Try to load from cache first
    try {
      const cached = localStorage.getItem(NOTIFICATIONS_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        set({ notifications: parsed.notifications || [] })
      }
    } catch (error) {
      console.error('Error loading notifications from cache:', error)
    }

    // Fetch fresh data
    await get().fetchNotifications()
    await get().fetchUnreadCount()
  },

  // Fetch notifications from API
  fetchNotifications: async (options = {}) => {
    const { limit = 20, offset = 0, unreadOnly = false, append = false } = options

    if (offset === 0) {
      set({ isLoading: true, error: null })
    } else {
      set({ isLoadingMore: true })
    }

    try {
      const response = await apiClient.get('/notifications', {
        params: { limit, offset, unread_only: unreadOnly }
      })

      const newNotifications = response.data?.data || []

      set((state) => {
        const notifications = append
          ? [...state.notifications, ...newNotifications]
          : newNotifications

        // Cache notifications
        try {
          localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify({
            notifications: notifications.slice(0, 50), // Cache only first 50
            timestamp: new Date().toISOString()
          }))
        } catch (error) {
          console.error('Error caching notifications:', error)
        }

        return {
          notifications,
          isLoading: false,
          isLoadingMore: false,
          hasMore: newNotifications.length === limit,
          error: null
        }
      })

      return newNotifications
    } catch (error) {
      console.error('Error fetching notifications:', error)
      set({
        isLoading: false,
        isLoadingMore: false,
        error: error.response?.data?.message || 'Failed to fetch notifications'
      })
      return []
    }
  },

  // Fetch unread count
  fetchUnreadCount: async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count')
      const count = response.data?.data?.count || 0
      set({ unreadCount: count })
      return count
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  },

  // Load more notifications (pagination)
  loadMoreNotifications: async () => {
    const { notifications, isLoadingMore, hasMore } = get()
    if (isLoadingMore || !hasMore) return

    await get().fetchNotifications({
      offset: notifications.length,
      append: true
    })
  },

  // Mark a notification as read
  markAsRead: async (notificationId) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`)

      set((state) => {
        const notifications = state.notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )

        // Update cache
        try {
          localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify({
            notifications: notifications.slice(0, 50),
            timestamp: new Date().toISOString()
          }))
        } catch (error) {
          console.error('Error updating notification cache:', error)
        }

        const unreadCount = Math.max(0, state.unreadCount - 1)
        return { notifications, unreadCount }
      })

      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      await apiClient.put('/notifications/read-all')

      set((state) => {
        const notifications = state.notifications.map(n => ({ ...n, is_read: true }))

        // Update cache
        try {
          localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify({
            notifications: notifications.slice(0, 50),
            timestamp: new Date().toISOString()
          }))
        } catch (error) {
          console.error('Error updating notification cache:', error)
        }

        return { notifications, unreadCount: 0 }
      })

      return true
    } catch (error) {
      console.error('Error marking all as read:', error)
      return false
    }
  },

  // Delete a notification
  deleteNotification: async (notificationId) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`)

      set((state) => {
        const notification = state.notifications.find(n => n.id === notificationId)
        const notifications = state.notifications.filter(n => n.id !== notificationId)

        // Update unread count if deleted notification was unread
        const unreadCount = notification && !notification.is_read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount

        // Update cache
        try {
          localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify({
            notifications: notifications.slice(0, 50),
            timestamp: new Date().toISOString()
          }))
        } catch (error) {
          console.error('Error updating notification cache:', error)
        }

        return { notifications, unreadCount }
      })

      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  },

  // Delete all read notifications
  deleteReadNotifications: async () => {
    try {
      await apiClient.delete('/notifications/read-all')

      set((state) => {
        const notifications = state.notifications.filter(n => !n.is_read)

        // Update cache
        try {
          localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify({
            notifications: notifications.slice(0, 50),
            timestamp: new Date().toISOString()
          }))
        } catch (error) {
          console.error('Error updating notification cache:', error)
        }

        return { notifications }
      })

      return true
    } catch (error) {
      console.error('Error deleting read notifications:', error)
      return false
    }
  },

  // Add a notification (typically from socket)
  addNotification: (notification) => {
    set((state) => {
      // Check if notification already exists
      if (state.notifications.find(n => n.id === notification.id)) {
        return state
      }

      const notifications = [notification, ...state.notifications]
      const unreadCount = notification.is_read ? state.unreadCount : state.unreadCount + 1

      // Update cache
      try {
        localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify({
          notifications: notifications.slice(0, 50),
          timestamp: new Date().toISOString()
        }))
      } catch (error) {
        console.error('Error updating notification cache:', error)
      }

      return { notifications, unreadCount }
    })
  },

  // Initialize Socket.IO connection
  initializeSocket: (userId) => {
    if (!userId) return

    const { socket: existingSocket } = get()

    // Don't create multiple connections
    if (existingSocket?.connected) return

    // Disconnect existing socket if any
    if (existingSocket) {
      existingSocket.disconnect()
    }

    // Create new socket connection
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socket.on('connect', () => {
      console.log('Socket connected for notifications')
      set({ isConnected: true })

      // Subscribe to user-specific notifications
      socket.emit('subscribe:notifications', userId)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      set({ isConnected: false })
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      set({ isConnected: false })
    })

    // Listen for new notifications
    socket.on('notification:new', (notification) => {
      console.log('New notification received:', notification)
      get().addNotification({
        ...notification,
        is_read: false
      })
    })

    set({ socket })
  },

  // Disconnect socket
  disconnectSocket: () => {
    const { socket, isConnected } = get()
    if (socket) {
      if (isConnected) {
        socket.disconnect()
      }
      set({ socket: null, isConnected: false })
    }
  },

  // Clear all notifications (for logout)
  clearNotifications: () => {
    get().disconnectSocket()
    localStorage.removeItem(NOTIFICATIONS_CACHE_KEY)
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      hasMore: true
    })
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  }
}))

export default useNotificationStore
