import { Navigate, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useAuthStore } from '@/stores/authStore'
import { Loader2 } from 'lucide-react'

/**
 * ProtectedRoute Component
 * 
 * Wraps protected routes and ensures only authenticated users can access them.
 * If not authenticated, redirects to login page with return URL.
 * Shows loading state while auth is being initialized.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isInitializing } = useAuthStore()
  const location = useLocation()

  // Show loading state while auth is initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    )
  }

  // User is authenticated, render the protected component
  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired
}

export default ProtectedRoute
