import { useState, useEffect } from 'react'
import { Upload, Download, FileText, AlertCircle, CheckCircle, Clock, FileWarning } from 'lucide-react'
import ImportModal from '@/components/import/ImportModal'
import { getImportHistory } from '@/services/importApi'

const STATUS_BADGES = {
  'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  'Processing': { color: 'bg-blue-100 text-blue-800', icon: Clock },
  'Completed': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  'Failed': { color: 'bg-red-100 text-red-800', icon: AlertCircle },
  'Partial': { color: 'bg-orange-100 text-orange-800', icon: FileWarning }
}

const ImportPage = () => {
  const [showModal, setShowModal] = useState(false)
  const [imports, setImports] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Fetch import history
  useEffect(() => {
    fetchImportHistory()
  }, [])

  const fetchImportHistory = async () => {
    try {
      setLoading(true)
      const response = await getImportHistory({ limit: 10 })
      if (response.success) {
        setImports(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch import history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImportComplete = (result) => {
    fetchImportHistory()
    
    if (result.success) {
      showToast({
        type: 'success',
        message: `Successfully imported ${result.successCount} projects!`
      })
    } else {
      showToast({
        type: 'warning',
        message: `Import completed with ${result.errorCount} errors. Check the error report for details.`
      })
    }
  }

  const showToast = ({ type, message }) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

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

  const formatDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return '-'
    const start = new Date(startedAt)
    const end = new Date(completedAt)
    const diff = Math.round((end - start) / 1000)
    
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.round(diff / 60)}m`
    return `${Math.round(diff / 3600)}h`
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`
          fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md animate-fade-in
          ${toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}
        `}>
          <div className="flex items-start">
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600 mr-3 flex-shrink-0" />
            )}
            <p className={toast.type === 'success' ? 'text-green-800' : 'text-orange-800'}>
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Projects</h1>
          <p className="text-gray-600 mt-1">
            Import projects from CSV files
          </p>
        </div>
        <div className="flex space-x-3">
          <a
            href="/import-template.csv"
            download
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">CSV Import Instructions</h3>
            <div className="mt-4 grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Required Columns</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Site Code (format: PREFIX-TYPE-NUMBER)</li>
                  <li>• Project Name</li>
                  <li>• Site Name</li>
                  <li>• Province</li>
                  <li>• Municipality</li>
                  <li>• Latitude (-90 to 90)</li>
                  <li>• Longitude (-180 to 180)</li>
                  <li>• Date of Activation (YYYY-MM-DD)</li>
                  <li>• Status (Pending, In Progress, Done, Cancelled)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Optional Columns</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Barangay</li>
                  <li>• District</li>
                </ul>
                <h4 className="font-medium text-gray-900 mb-2 mt-4">File Requirements</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• CSV format only</li>
                  <li>• Maximum file size: 10MB</li>
                  <li>• First row must be headers</li>
                  <li>• Duplicate site codes will be skipped</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Imports */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Imports</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading import history...</p>
          </div>
        ) : imports.length === 0 ? (
          <div className="p-8 text-center">
            <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No imports yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Import your first CSV file to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Errors
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {imports.map((importItem) => {
                  const statusConfig = STATUS_BADGES[importItem.status] || STATUS_BADGES['Pending']
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <tr key={importItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 mr-3" />
                          <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {importItem.original_filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${statusConfig.color}
                        `}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {importItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {importItem.total_rows}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-green-600 font-medium">
                          {importItem.success_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`
                          text-sm font-medium
                          ${importItem.error_count > 0 ? 'text-red-600' : 'text-gray-500'}
                        `}>
                          {importItem.error_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(importItem.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDuration(importItem.started_at, importItem.completed_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}

export default ImportPage
