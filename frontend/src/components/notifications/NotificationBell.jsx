import { useEffect, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import NotificationDropdown from './NotificationDropdown'
import PropTypes from 'prop-types'

/**
 * NotificationBell Component
 *
 * Displays a bell icon with an unread badge.
 * Clicking opens a dropdown with notifications.
 * Integrates with Socket.IO for real-time updates.
 */
const NotificationBell = ({ className = '' }) => {
  const { user } = useAuthStore()
  const {
    unreadCount,
    isLoading,
    fetchUnreadCount,
    initializeSocket,
    disconnectSocket,
    initializeNotifications
  } = useNotificationStore()

  const [isOpen, setIsOpen] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Initialize notifications and socket on mount
  useEffect(() => {
    if (user?.id && !hasInitialized) {
      setHasInitialized(true)

      // Initialize socket connection for real-time notifications
      initializeSocket(user.id)

      // Fetch initial data
      initializeNotifications()

      // Fetch unread count
      fetchUnreadCount()

      // Set up periodic refresh of unread count (every 30 seconds as fallback)
      const interval = setInterval(() => {
        fetchUnreadCount()
      }, 30000)

      return () => {
        clearInterval(interval)
        disconnectSocket()
      }
    }
  }, [user?.id, hasInitialized, initializeSocket, disconnectSocket, initializeNotifications, fetchUnreadCount])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.notification-bell-container')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  // Format unread count for display (99+ for large numbers)
  const displayCount = unreadCount > 99 ? '99+' : unreadCount

  return (
    <div className={`notification-bell-container relative ${className}`}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        {isLoading && !isOpen ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Bell className="w-5 h-5" />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center border-2 border-white">
            {displayCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <NotificationDropdown onClose={() => setIsOpen(false)} />
      )}
    </div>
  )
}

NotificationBell.propTypes = {
  className: PropTypes.string
}

export default NotificationBell
