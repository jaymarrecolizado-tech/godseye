import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit2, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  MoreHorizontal
} from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'

const ProjectTable = ({ onEdit, onDelete }) => {
  const { 
    projects, 
    loading, 
    pagination, 
    setPagination 
  } = useProjectStore()

  const [selectedRows, setSelectedRows] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(projects.map(p => p.id))
    } else {
      setSelectedRows([])
    }
  }

  const handleSelectRow = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    )
  }

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination({ ...pagination, page })
    }
  }

  const getStatusBadgeClass = (status) => {
    const key = status?.toLowerCase().replace(/\s+/g, '')
    switch (key) {
      case 'done':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'inprogress':
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeBadgeClass = (type) => {
    const key = type?.toLowerCase().replace(/[^a-z]/g, '')
    switch (key) {
      case 'wifi':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pnpki':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'iidb':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'elgu':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const columns = [
    { key: 'site_code', label: 'Site Code', sortable: true },
    { key: 'project_type', label: 'Project Type', sortable: true },
    { key: 'site_name', label: 'Site Name', sortable: true },
    { key: 'location', label: 'Location', sortable: false },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'activation_date', label: 'Activation Date', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center justify-between">
          <span className="text-sm text-blue-800">
            {selectedRows.length} row(s) selected
          </span>
          <button 
            className="text-sm text-red-600 hover:text-red-700 font-medium"
            onClick={() => {
              // Handle bulk delete
              console.log('Delete selected:', selectedRows)
              setSelectedRows([])
            }}
          >
            Delete Selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedRows.length === projects.length && projects.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && sortConfig.key === column.key && (
                      sortConfig.direction === 'asc' 
                        ? <ChevronUp className="w-4 h-4 ml-1" />
                        : <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-500">
                  No projects found
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr 
                  key={project.id} 
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(project.id)}
                      onChange={() => handleSelectRow(project.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link 
                      to={`/projects/${project.id}`}
                      className="font-mono text-sm text-blue-600 hover:text-blue-700"
                    >
                      {project.site_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getTypeBadgeClass(project.project_type)}`}>
                      {project.project_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 font-medium truncate max-w-[200px]">
                      {project.site_name}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">
                      {project.municipality}, {project.province}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">
                      {formatDate(project.activation_date)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/projects/${project.id}`}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => onEdit?.(project)}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete?.(project)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    pagination.page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectTable
