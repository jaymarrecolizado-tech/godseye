import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { NotificationBell } from '@/components/notifications'
import { 
  Menu, 
  User, 
  ChevronDown, 
  Settings, 
  LogOut,
  HelpCircle,
  Loader2
} from 'lucide-react'
import PropTypes from 'prop-types'

/**
 * Header Component
 * 
 * Displays the top navigation bar with:
 * - Mobile menu toggle
 * - Page title
 * - Notifications
 * - User profile with dropdown menu
 * - Logout functionality
 */
const Header = ({ onMenuClick }) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { clearNotifications } = useNotificationStore()
  const [showProfile, setShowProfile] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Clear notifications on logout
  useEffect(() => {
    return () => {
      // Cleanup if component unmounts
    }
  }, [])

  // Get user display name
  const displayName = user?.fullName || user?.username || 'User'
  
  // Get user role (capitalize first letter)
  const userRole = user?.role 
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'User'

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true)
    setShowProfile(false)
    
    try {
      // Clear notifications before logout
      clearNotifications()
      await logout()
      // Redirect to login page
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Close dropdowns when clicking outside
  const handleDropdownClose = () => {
    setShowProfile(false)
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      {/* Left side */}
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 mr-2"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800 hidden sm:block">
          Project Tracking System
        </h2>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <NotificationBell />

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile)
            }}
            disabled={isLoggingOut}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {getInitials(displayName)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{userRole}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500 hidden md:block" />
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <>
              <div 
                className="fixed inset-0 z-30"
                onClick={handleDropdownClose}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-40">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-100 md:hidden">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">{userRole}</p>
                </div>
                
                <div className="px-4 py-2 border-b border-gray-100 hidden md:block">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email || user?.username}
                  </p>
                </div>

                {/* Menu Items */}
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                  <Settings className="w-4 h-4 mr-2 text-gray-500" />
                  Settings
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                  <HelpCircle className="w-4 h-4 mr-2 text-gray-500" />
                  Help & Support
                </button>
                
                <hr className="my-1 border-gray-100" />
                
                {/* Logout Button */}
                <button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

Header.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
}

export default Header
