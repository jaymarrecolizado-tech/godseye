import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardList,
  Calendar,
  User,
  Activity,
  Database,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  X,
  Eye,
  ArrowLeft,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { auditApi } from '@/services/api'

// Action type configurations
const ACTION_CONFIG = {
  CREATE: {
    label: 'Created',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: 'plus'
  },
  UPDATE: {
    label: 'Updated',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: 'edit'
  },
  DELETE: {
    label: 'Deleted',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: 'trash'
  }
}

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format date for input
const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

const AuditLog = () => {
  // State
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [selectedLog, setSelectedLog] = useState(null)
  const [entityTypes, setEntityTypes] = useState([])

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Filter state
  const [filters, setFilters] = useState({
    entity_type: '',
    action: '',
    date_from: '',
    date_to: ''
  })

  const [tempFilters, setTempFilters] = useState({
    entity_type: '',
    action: '',
    date_from: '',
    date_to: ''
  })

  // Stats state
  const [stats, setStats] = useState(null)

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      }

      const response = await auditApi.getAuditLogs(params)

      if (response.success) {
        setLogs(response.data)
        setPagination(prev => ({
          ...prev,
          total: response.meta.pagination.total,
          totalPages: response.meta.pagination.totalPages
        }))
      } else {
        throw new Error(response.message || 'Failed to fetch audit logs')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching audit logs')
      console.error('Audit logs fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  // Fetch entity types
  const fetchEntityTypes = useCallback(async () => {
    try {
      const response = await auditApi.getEntityTypes()
      if (response.success) {
        setEntityTypes(response.data)
      }
    } catch (err) {
      console.error('Failed to fetch entity types:', err)
    }
  }, [])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([key, v]) =>
          v !== '' && (key === 'date_from' || key === 'date_to')
        )
      )
      const response = await auditApi.getAuditStats(params)
      if (response.success) {
        setStats(response.data)
      }
    } catch (err) {
      console.error('Failed to fetch audit stats:', err)
    }
  }, [filters])

  // Initial load
  useEffect(() => {
    fetchEntityTypes()
  }, [fetchEntityTypes])

  // Fetch logs when dependencies change
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Fetch stats when filters change
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Toggle row expansion
  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setTempFilters(prev => ({ ...prev, [field]: value }))
  }

  // Apply filters
  const applyFilters = () => {
    setFilters(tempFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Clear filters
  const clearFilters = () => {
    const emptyFilters = {
      entity_type: '',
      action: '',
      date_from: '',
      date_to: ''
    }
    setTempFilters(emptyFilters)
    setFilters(emptyFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }))
    }
  }

  // Get changes between old and new values
  const getChanges = (oldValues, newValues) => {
    if (!oldValues && !newValues) return []

    const changes = []
    const allKeys = new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {})
    ])

    allKeys.forEach(key => {
      const oldVal = oldValues?.[key]
      const newVal = newValues?.[key]

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal
        })
      }
    })

    return changes
  }

  // Render action badge
  const renderActionBadge = (action) => {
    const config = ACTION_CONFIG[action] || {
      label: action,
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
        {config.label}
      </span>
    )
  }

  // Stat Card Component
  const StatCard = ({ title, value, color }) => (
    <div className={`bg-${color}-50 rounded-lg p-4 border border-${color}-100`}>
      <p className="text-xs font-medium text-gray-600 uppercase">{title}</p>
      <p className={`text-2xl font-bold text-${color}-600 mt-1`}>{value || 0}</p>
    </div>
  )

  // Pagination Component
  const Pagination = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-medium">{pagination.total}</span> results
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {startPage > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                1
              </button>
              {startPage > 2 && <span className="px-2">...</span>}
            </>
          )}

          {pages.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-2 rounded-lg border ${
                page === pagination.page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}

          {endPage < pagination.totalPages && (
            <>
              {endPage < pagination.totalPages - 1 && <span className="px-2">...</span>}
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                {pagination.totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Detail Modal
  const DetailModal = ({ log, onClose }) => {
    if (!log) return null

    const changes = log.action === 'UPDATE' ? getChanges(log.old_values, log.new_values) : []

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Audit Log Details
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Action</p>
                    <div className="mt-1">{renderActionBadge(log.action)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Entity</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {log.entity_type} #{log.entity_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {log.user?.name || 'System'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date/Time</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>

                {/* Changes for UPDATE action */}
                {log.action === 'UPDATE' && changes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Changes Made</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Old Value</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">New Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {changes.map((change, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                {change.field}
                              </td>
                              <td className="px-4 py-2 text-sm text-red-600 line-through">
                                {change.oldValue === null ? '-' : String(change.oldValue)}
                              </td>
                              <td className="px-4 py-2 text-sm text-green-600">
                                {change.newValue === null ? '-' : String(change.newValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Full Values */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {log.old_values && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Old Values</h4>
                      <pre className="p-3 bg-gray-50 rounded-lg text-xs overflow-auto max-h-64">
                        {JSON.stringify(log.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.new_values && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">New Values</h4>
                      <pre className="p-3 bg-gray-50 rounded-lg text-xs overflow-auto max-h-64">
                        {JSON.stringify(log.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">
            Track all changes made to projects and system data
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Records" value={stats.total} color="blue" />
          <StatCard title="Created" value={stats.actions?.create} color="green" />
          <StatCard title="Updated" value={stats.actions?.update} color="blue" />
          <StatCard title="Deleted" value={stats.actions?.delete} color="red" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Entity Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              value={tempFilters.entity_type}
              onChange={(e) => handleFilterChange('entity_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={tempFilters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
            </select>
          </div>

          {/* Date From Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={tempFilters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date To Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={tempFilters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={applyFilters}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Search className="w-4 h-4 mr-2" />
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchLogs}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <span className="text-gray-600">Loading audit logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No audit logs found</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          {log.user?.name || 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Database className="w-4 h-4 mr-2 text-gray-400" />
                          {log.entity_type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        #{log.entity_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.action === 'UPDATE' && log.new_values && (
                          <span className="text-xs">
                            {Object.keys(log.new_values).length} fields changed
                          </span>
                        )}
                        {log.action === 'CREATE' && (
                          <span className="text-xs text-green-600">New record created</span>
                        )}
                        {log.action === 'DELETE' && (
                          <span className="text-xs text-red-600">Record deleted</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleRow(log.id)}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title="Toggle Details"
                          >
                            {expandedRows.has(log.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expandable Row */}
                    {expandedRows.has(log.id) && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="space-y-4">
                            {log.action === 'UPDATE' && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                  <Activity className="w-4 h-4 mr-1" />
                                  Changes Summary
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {getChanges(log.old_values, log.new_values).map((change, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                                        {change.field}
                                      </p>
                                      <div className="flex items-center text-sm">
                                        <span className="text-red-600 line-through mr-2">
                                          {change.oldValue === null ? 'null' : String(change.oldValue)}
                                        </span>
                                        <span className="text-gray-400">→</span>
                                        <span className="text-green-600 ml-2">
                                          {change.newValue === null ? 'null' : String(change.newValue)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {log.old_values && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">Old Values</h4>
                                  <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-48">
                                    {JSON.stringify(log.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_values && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">New Values</h4>
                                  <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-48">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && <Pagination />}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}

export default AuditLog
