import { useState, useEffect } from 'react'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import { Navigate } from 'react-router-dom'
import UserTable from '@/components/users/UserTable'
import UserForm from '@/components/users/UserForm'
import UserFilters from '@/components/users/UserFilters'
import {
  Users,
  UserPlus,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  Shield,
  AlertTriangle,
  Key
} from 'lucide-react'

/**
 * UserManagement Page
 * Admin-only page for managing system users
 */
const UserManagement = () => {
  const { user: currentUser } = useAuthStore()
  const {
    users,
    filters,
    pagination,
    sortConfig,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    roles,
    setFilters,
    clearFilters,
    setSortConfig,
    setPage,
    fetchUsers,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser,
    resetPassword,
    clearMessages
  } = useUserStore()

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false)
  const [resetPasswordData, setResetPasswordData] = useState(null)

  // Check if user is admin
  if (currentUser?.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />
  }

  // Fetch users on mount and when filters/sort/page change
  useEffect(() => {
    fetchUsers()
  }, [filters, pagination.page, sortConfig])

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        clearMessages()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  // Handle edit user
  const handleEdit = (user) => {
    setSelectedUser(user)
    setIsFormOpen(true)
  }

  // Handle create user
  const handleCreate = () => {
    setSelectedUser(null)
    setIsFormOpen(true)
  }

  // Handle form submit
  const handleFormSubmit = async (formData) => {
    let result
    if (selectedUser) {
      result = await updateUser(selectedUser.id, formData)
    } else {
      result = await createUser(formData)
    }

    if (result.success) {
      setIsFormOpen(false)
      setSelectedUser(null)
    }
  }

  // Handle toggle status
  const handleToggleStatus = async (id, isActive) => {
    await updateUserStatus(id, isActive)
  }

  // Handle delete
  const handleDeleteClick = (user) => {
    setSelectedUser(user)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (selectedUser) {
      const result = await deleteUser(selectedUser.id)
      if (result.success) {
        setIsDeleteModalOpen(false)
        setSelectedUser(null)
      }
    }
  }

  // Handle reset password
  const handleResetPasswordClick = (user) => {
    setSelectedUser(user)
    setIsResetPasswordModalOpen(true)
  }

  const handleConfirmResetPassword = async () => {
    if (selectedUser) {
      const result = await resetPassword(selectedUser.id)
      if (result.success) {
        setResetPasswordData(result)
        setIsResetPasswordModalOpen(false)
      }
    }
  }

  // Handle sort
  const handleSort = (column, order) => {
    setSortConfig(column, order)
  }

  // Handle page change
  const handlePageChange = (page) => {
    setPage(page)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="w-8 h-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500">Manage system users and their permissions</p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={clearMessages}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-green-800 font-medium">Success</p>
            <p className="text-green-600 text-sm">{successMessage}</p>
          </div>
          <button
            onClick={clearMessages}
            className="text-green-400 hover:text-green-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <Shield className="w-5 h-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Shield className="w-5 h-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'Admin').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 text-amber-600">
              <Shield className="w-5 h-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Managers</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'Manager').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <UserFilters
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
        onRefresh={fetchUsers}
        isLoading={isLoading}
        roles={roles}
      />

      {/* User Table */}
      <UserTable
        users={users}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        onResetPassword={handleResetPasswordClick}
        onDelete={handleDeleteClick}
        isSubmitting={isSubmitting}
      />

      {/* User Form Modal */}
      <UserForm
        user={selectedUser}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedUser(null)
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        roles={roles}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Delete User</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the user <strong>"{selectedUser?.username}"</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete User'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsResetPasswordModalOpen(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-amber-100 rounded-full">
                  <Key className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Reset Password</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to reset the password for <strong>"{selectedUser?.username}"</strong>? A new random password will be generated.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmResetPassword}
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Password Display Modal */}
      {resetPasswordData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setResetPasswordData(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <Key className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Password Reset Successful</h3>
              </div>
              <p className="text-gray-600 mb-4">
                The password has been reset for <strong>"{selectedUser?.username}"</strong>. Please share this password securely with the user:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <code className="text-lg font-mono text-gray-800">{resetPasswordData.newPassword}</code>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setResetPasswordData(null)
                    setSelectedUser(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
