import { useEffect, useRef } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  AlertCircle,
  FolderOpen,
  UserPlus,
  FileSpreadsheet,
  Info
} from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'
import NotificationItem from './NotificationItem'
import PropTypes from 'prop-types'

/**
 * NotificationDropdown Component
 *
 * Displays a dropdown list of notifications with actions:
 * - Mark as read
 * - Mark all as read
 * - Delete notification
 * - Delete read notifications
 */
const NotificationDropdown = ({ onClose }) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    markAllAsRead,
    deleteReadNotifications,
    loadMoreNotifications,
    fetchNotifications
  } = useNotificationStore()

  const dropdownRef = useRef(null)

  // Refresh notifications when dropdown opens
  useEffect(() => {
    fetchNotifications({ limit: 20, offset: 0 })
  }, [fetchNotifications])

  // Handle scroll for infinite loading
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop - clientHeight < 50 && !isLoadingMore && hasMore) {
      loadMoreNotifications()
    }
  }

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return
    await markAllAsRead()
  }

  const handleDeleteRead = async () => {
    await deleteReadNotifications()
  }

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="w-4 h-4" />
      case 'import':
        return <FileSpreadsheet className="w-4 h-4" />
      case 'user':
        return <UserPlus className="w-4 h-4" />
      case 'system':
      default:
        return <Info className="w-4 h-4" />
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
        role="menu"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleDeleteRead}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete read notifications"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Notifications list */}
        <div
          className="max-h-96 overflow-y-auto"
          onScroll={handleScroll}
        >
          {isLoading && notifications.length === 0 ? (
            // Loading state
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No notifications</p>
              <p className="text-xs text-gray-500 text-center">
                You'll see notifications here when there's activity
              </p>
            </div>
          ) : (
            // Notification items
            <>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  icon={getNotificationIcon(notification.type)}
                  onClose={onClose}
                />
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="px-4 py-3 text-center border-t border-gray-50">
                  {isLoadingMore ? (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto" />
                  ) : (
                    <button
                      onClick={loadMoreNotifications}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
          <button
            onClick={() => {
              // Could navigate to a full notifications page
              onClose()
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            View all notifications
          </button>
        </div>
      </div>
    </>
  )
}

NotificationDropdown.propTypes = {
  onClose: PropTypes.func.isRequired
}

export default NotificationDropdown
