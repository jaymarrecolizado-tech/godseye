import { useState } from 'react'
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Download, 
  X,
  ChevronDown,
  ChevronUp,
  FileWarning
} from 'lucide-react'
import PropTypes from 'prop-types'
import { downloadErrorReport } from '@/services/importApi'

const STATUS_CONFIG = {
  'Pending': {
    icon: Loader2,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Pending'
  },
  'Processing': {
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Processing',
    animate: true
  },
  'Completed': {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Completed'
  },
  'Failed': {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Failed'
  },
  'Partial': {
    icon: FileWarning,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Partial Success'
  }
}

const ImportProgress = ({ 
  importData, 
  onClose, 
  onComplete 
}) => {
  const [showErrors, setShowErrors] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const {
    status = 'Pending',
    progress = 0,
    totalRows = 0,
    successCount = 0,
    errorCount = 0,
    errors = [],
    id: importId
  } = importData || {}

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG['Pending']
  const StatusIcon = statusConfig.icon

  const isComplete = status === 'Completed' || status === 'Failed' || status === 'Partial'
  const isSuccessful = status === 'Completed'
  const hasErrors = errorCount > 0

  const handleDownloadErrors = async () => {
    if (!importId || downloading) return
    
    try {
      setDownloading(true)
      const blob = await downloadErrorReport(importId)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `import_errors_${importId}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download error report:', error)
      alert('Failed to download error report. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className={`
        flex items-center p-4 rounded-lg border
        ${statusConfig.bgColor} ${statusConfig.borderColor}
      `}>
        <StatusIcon 
          className={`
            w-8 h-8 mr-4 flex-shrink-0
            ${statusConfig.color}
            ${statusConfig.animate ? 'animate-spin' : ''}
          `} 
        />
        <div className="flex-1">
          <h3 className={`font-semibold ${statusConfig.color}`}>
            {statusConfig.label}
          </h3>
          <p className="text-sm text-gray-600">
            {status === 'Processing' && `Processing ${totalRows} rows...`}
            {status === 'Pending' && 'Waiting to start...'}
            {isComplete && `Processed ${totalRows} rows`}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium text-gray-900">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`
              h-3 rounded-full transition-all duration-500
              ${isSuccessful ? 'bg-green-500' : hasErrors ? 'bg-orange-500' : 'bg-blue-600'}
            `}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-gray-900">{totalRows}</p>
          <p className="text-xs text-gray-600 uppercase tracking-wide">Total</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{successCount}</p>
          <p className="text-xs text-green-600 uppercase tracking-wide">Success</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600">{errorCount}</p>
          <p className="text-xs text-red-600 uppercase tracking-wide">Errors</p>
        </div>
      </div>

      {/* Error Details */}
      {hasErrors && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowErrors(!showErrors)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-gray-900">
              Error Details ({errors.length} errors)
            </span>
            {showErrors ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          
          {showErrors && (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700">Row</th>
                    <th className="text-left p-3 font-medium text-gray-700">Site Code</th>
                    <th className="text-left p-3 font-medium text-gray-700">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.slice(0, 50).map((error, index) => (
                    <tr key={index} className="border-t border-gray-100">
                      <td className="p-3 text-gray-600">{error.rowNumber}</td>
                      <td className="p-3 text-gray-900 font-medium">{error.siteCode || '-'}</td>
                      <td className="p-3 text-red-600">
                        {Array.isArray(error.errors) 
                          ? error.errors.join('; ') 
                          : error.errors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {errors.length > 50 && (
                <p className="p-3 text-sm text-gray-500 text-center border-t">
                  ... and {errors.length - 50} more errors
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-3">
          {hasErrors && importId && (
            <button
              type="button"
              onClick={handleDownloadErrors}
              disabled={downloading}
              className="
                inline-flex items-center px-4 py-2 
                border border-gray-300 rounded-lg
                text-sm font-medium text-gray-700 
                bg-white hover:bg-gray-50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Downloading...' : 'Download Error Report'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="
            inline-flex items-center px-4 py-2
            bg-gray-100 text-gray-700 rounded-lg
            text-sm font-medium hover:bg-gray-200
            transition-colors
          "
        >
          <X className="w-4 h-4 mr-2" />
          {isComplete ? 'Close' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}

ImportProgress.propTypes = {
  importData: PropTypes.shape({
    id: PropTypes.number,
    status: PropTypes.oneOf(['Pending', 'Processing', 'Completed', 'Failed', 'Partial']),
    progress: PropTypes.number,
    totalRows: PropTypes.number,
    successCount: PropTypes.number,
    errorCount: PropTypes.number,
    errors: PropTypes.arrayOf(PropTypes.shape({
      rowNumber: PropTypes.number,
      siteCode: PropTypes.string,
      errors: PropTypes.oneOfType([PropTypes.string, PropTypes.array])
    }))
  }),
  onClose: PropTypes.func.isRequired,
  onComplete: PropTypes.func
}

export default ImportProgress
