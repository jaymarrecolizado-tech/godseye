import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import MapView from './pages/MapView'
import ProjectList from './pages/ProjectList'
import ProjectDetail from './pages/ProjectDetail'
import ImportPage from './pages/ImportPage'
import Reports from './pages/Reports'
import Login from './pages/Login'

/**
 * Main App Component
 * 
 * Handles routing and layout structure.
 * - Public routes: /login
 * - Protected routes: /, /dashboard, /map, /projects, /import, /reports
 */
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAuthenticated, isInitializing } = useAuthStore()
  const location = useLocation()

  // Show loading state while auth is initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Login route - redirect to dashboard if already authenticated
  if (location.pathname === '/login') {
    if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />
    }
    return <Login />
  }

  // Main app layout with protected routes
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Routes>
            {/* Public route - redirect based on auth status */}
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/map" 
              element={
                <ProtectedRoute>
                  <MapView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects" 
              element={
                <ProtectedRoute>
                  <ProjectList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:id" 
              element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/import" 
              element={
                <ProtectedRoute>
                  <ImportPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute>
                  <Dashboard showReports={true} />
                </ProtectedRoute>
              } 
            />

            {/* Catch all - redirect to appropriate page */}
            <Route 
              path="*" 
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
