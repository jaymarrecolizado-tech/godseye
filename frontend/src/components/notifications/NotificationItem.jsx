import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  Trash2,
  Loader2,
  FolderOpen,
  FileSpreadsheet,
  UserPlus,
  Info
} from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'
import PropTypes from 'prop-types'

/**
 * NotificationItem Component
 *
 * Displays a single notification with:
 * - Type icon
 * - Title and message
 * - Timestamp
 * - Mark as read / delete actions
 */
const NotificationItem = ({ notification, icon, onClose }) => {
  const navigate = useNavigate()
  const { markAsRead, deleteNotification } = useNotificationStore()
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { id, type, title, message, is_read, created_at, data } = notification

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} min${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  // Get background color based on notification type
  const getTypeStyles = (type) => {
    switch (type) {
      case 'project':
        return 'bg-blue-100 text-blue-600'
      case 'import':
        return 'bg-green-100 text-green-600'
      case 'user':
        return 'bg-purple-100 text-purple-600'
      case 'system':
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  // Get default icon if none provided
  const getDefaultIcon = (type) => {
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

  const handleClick = async () => {
    // Mark as read on click
    if (!is_read) {
      await handleMarkAsRead()
    }

    // Navigate based on notification type and data
    if (data) {
      if (data.projectId) {
        navigate(`/projects/${data.projectId}`)
      } else if (data.importId) {
        navigate('/import')
      } else if (data.userId) {
        navigate('/users')
      }
    }

    onClose()
  }

  const handleMarkAsRead = async (e) => {
    if (e) e.stopPropagation()
    if (is_read || isMarkingRead) return

    setIsMarkingRead(true)
    await markAsRead(id)
    setIsMarkingRead(false)
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (isDeleting) return

    setIsDeleting(true)
    await deleteNotification(id)
    setIsDeleting(false)
  }

  return (
    <div
      onClick={handleClick}
      className={`group relative px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${
        !is_read ? 'bg-blue-50/50' : ''
      }`}
      role="menuitem"
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getTypeStyles(type)}`}>
          {icon || getDefaultIcon(type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <p className={`text-sm font-medium truncate ${!is_read ? 'text-gray-900' : 'text-gray-700'}`}>
              {title}
            </p>
            <span className="flex-shrink-0 text-xs text-gray-400 ml-2">
              {formatRelativeTime(created_at)}
            </span>
          </div>
          <p className={`text-sm mt-0.5 line-clamp-2 ${!is_read ? 'text-gray-700' : 'text-gray-500'}`}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Mark as read */}
          {!is_read && (
            <button
              onClick={handleMarkAsRead}
              disabled={isMarkingRead}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Mark as read"
            >
              {isMarkingRead ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Unread indicator */}
      {!is_read && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
      )}
    </div>
  )
}

NotificationItem.propTypes = {
  notification: PropTypes.shape({
    id: PropTypes.number.isRequired,
    type: PropTypes.oneOf(['project', 'import', 'user', 'system']).isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    is_read: PropTypes.bool.isRequired,
    created_at: PropTypes.string.isRequired,
    data: PropTypes.object
  }).isRequired,
  icon: PropTypes.node,
  onClose: PropTypes.func.isRequired
}

export default NotificationItem
