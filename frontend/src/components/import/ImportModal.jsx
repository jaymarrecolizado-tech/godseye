import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Upload, AlertTriangle, Check, ArrowRight, Download } from 'lucide-react'
import PropTypes from 'prop-types'
import CSVUploader from './CSVUploader'
import ImportProgress from './ImportProgress'
import ConflictResolutionTable from './ConflictResolutionTable'
import { uploadCSV, getImportStatus, detectDuplicates } from '@/services/importApi'

const STEPS = {
  UPLOAD: 'upload',
  CONFLICTS: 'conflicts',
  PROGRESS: 'progress',
  RESULTS: 'results'
}

const ImportModal = ({ isOpen, onClose, onImportComplete }) => {
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importId, setImportId] = useState(null)
  const [importData, setImportData] = useState(null)
  const [error, setError] = useState(null)
  
  // Conflict detection state
  const [selectedFile, setSelectedFile] = useState(null)
  const [conflicts, setConflicts] = useState([])
  const [newEntries, setNewEntries] = useState([])
  const [resolutions, setResolutions] = useState({})
  const [isDetectingConflicts, setIsDetectingConflicts] = useState(false)
  
  const pollingRef = useRef(null)
  const socketRef = useRef(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(STEPS.UPLOAD)
      setIsUploading(false)
      setUploadProgress(0)
      setImportId(null)
      setImportData(null)
      setError(null)
      setSelectedFile(null)
      setConflicts([])
      setNewEntries([])
      setResolutions({})
      setIsDetectingConflicts(false)
    } else {
      // Cleanup when closing
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [isOpen])

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!importId || !isOpen) return

    // Import socket.io client dynamically
    const setupSocket = async () => {
      try {
        const { io } = await import('socket.io-client')
        const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'
        
        const socket = io(API_URL)
        socketRef.current = socket

        socket.on('connect', () => {
          console.log('Socket connected for import:', importId)
          socket.emit('subscribe:imports', importId)
        })

        socket.on('import:progress', (data) => {
          if (data.importId === importId) {
            setImportData(prev => ({
              ...prev,
              progress: data.progress,
              successCount: data.successCount,
              errorCount: data.errorCount
            }))
          }
        })

        socket.on('import:complete', (data) => {
          if (data.importId === importId) {
            handleImportComplete(data.results)
          }
        })

        socket.on('import:error', (data) => {
          if (data.importId === importId) {
            setError(data.error)
            setCurrentStep(STEPS.RESULTS)
          }
        })

        socket.on('disconnect', () => {
          console.log('Socket disconnected')
        })
      } catch (err) {
        console.log('Socket.io not available, falling back to polling')
      }
    }

    setupSocket()

    // Fallback polling
    pollingRef.current = setInterval(async () => {
      try {
        const response = await getImportStatus(importId)
        if (response.success) {
          const data = response.data
          setImportData(data)
          
          if (['Completed', 'Failed', 'Partial'].includes(data.status)) {
            handleImportComplete(data)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 2000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [importId, isOpen])

  const handleImportComplete = (data) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    setImportData(data)
    setCurrentStep(STEPS.RESULTS)
    
    // Notify parent if import was successful
    if (data.status === 'Completed' || data.status === 'Partial') {
      onImportComplete?.({
        success: data.status === 'Completed',
        totalRows: data.totalRows,
        successCount: data.successCount,
        errorCount: data.errorCount
      })
    }
  }

  const handleFileSelected = async (file) => {
    setSelectedFile(file)
    setIsDetectingConflicts(true)
    setError(null)

    try {
      // Detect conflicts first
      const response = await detectDuplicates(file)

      if (response.success) {
        setConflicts(response.data.conflicts || [])
        setNewEntries(response.data.newEntries || [])
        
        // If there are conflicts, show the conflicts step
        if (response.data.conflicts.length > 0) {
          setCurrentStep(STEPS.CONFLICTS)
        } else {
          // No conflicts, proceed directly to upload
          await startImport(file, [])
        }
      } else {
        setError(response.message || 'Failed to analyze file for conflicts')
      }
    } catch (err) {
      console.error('Conflict detection error:', err)
      setError(
        err.response?.data?.message || 
        'Failed to analyze file for conflicts. Please try again.'
      )
    } finally {
      setIsDetectingConflicts(false)
    }
  }

  const startImport = async (file, conflictResolutions) => {
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Prepare resolutions array from the resolutions object
      const resolutionsArray = Object.entries(conflictResolutions).map(([rowIndex, action]) => ({
        rowIndex: parseInt(rowIndex),
        action
      }))

      const response = await uploadCSV(file, {
        skipDuplicates: false, // We'll handle duplicates via conflict resolution
        updateExisting: false,
        conflictsResolution: resolutionsArray.length > 0 ? resolutionsArray : null
      })

      if (response.success) {
        setImportId(response.data.importId)
        setImportData({
          id: response.data.importId,
          status: 'Pending',
          progress: 0,
          totalRows: response.data.totalRows,
          successCount: 0,
          errorCount: 0,
          errors: []
        })
        setCurrentStep(STEPS.PROGRESS)
      } else {
        setError(response.message || 'Upload failed')
        setIsUploading(false)
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(
        err.response?.data?.message || 
        'Failed to upload file. Please try again.'
      )
      setIsUploading(false)
    }
  }

  const handleResolutionChange = (rowIndex, action) => {
    setResolutions(prev => ({
      ...prev,
      [rowIndex]: action
    }))
  }

  const handleSelectAll = (action) => {
    const newResolutions = {}
    conflicts.forEach(conflict => {
      newResolutions[conflict.rowIndex] = action
    })
    setResolutions(newResolutions)
  }

  const handleProceedWithImport = () => {
    // Check if all conflicts have been resolved
    const unresolvedConflicts = conflicts.filter(c => !resolutions[c.rowIndex])
    
    if (unresolvedConflicts.length > 0) {
      setError(`Please resolve all ${unresolvedConflicts.length} conflict(s) before proceeding`)
      return
    }

    startImport(selectedFile, resolutions)
  }

  const handleClose = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
    onClose()
  }, [onClose])

  const handleDownloadConflictReport = () => {
    // Generate a CSV report of conflicts
    const headers = ['Row', 'Conflict Type', 'Site Code', 'Site Name', 'Province', 'Municipality', 'Selected Action', 'Different Fields']
    const rows = conflicts.map(c => [
      c.rowIndex,
      c.conflictType,
      c.existing.site_code,
      c.existing.site_name,
      c.existing.province,
      c.existing.municipality,
      resolutions[c.rowIndex] || 'Undecided',
      c.differences.join('; ')
    ])
    
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conflict-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case STEPS.UPLOAD:
        return 'Import Projects from CSV'
      case STEPS.CONFLICTS:
        return 'Resolve Conflicts'
      case STEPS.PROGRESS:
        return 'Processing Import...'
      case STEPS.RESULTS:
        return 'Import Complete'
      default:
        return 'Import Projects'
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case STEPS.UPLOAD:
        return 'Upload your CSV file to get started'
      case STEPS.CONFLICTS:
        return 'Review and resolve conflicts between existing and incoming data'
      case STEPS.PROGRESS:
        return 'Processing your data...'
      case STEPS.RESULTS:
        return 'Import complete'
      default:
        return ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={currentStep === STEPS.PROGRESS ? undefined : handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full ${currentStep === STEPS.CONFLICTS ? 'max-w-6xl' : 'max-w-2xl'} bg-white rounded-xl shadow-2xl`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {currentStep === STEPS.CONFLICTS ? (
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              ) : (
                <Upload className="w-6 h-6 text-blue-600" />
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {getStepTitle()}
                </h2>
                <p className="text-sm text-gray-500">
                  {getStepDescription()}
                </p>
              </div>
            </div>
            {currentStep !== STEPS.PROGRESS && (
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {currentStep === STEPS.UPLOAD && (
              <CSVUploader
                onUpload={handleFileSelected}
                isUploading={isDetectingConflicts}
                uploadProgress={uploadProgress}
              />
            )}

            {currentStep === STEPS.CONFLICTS && (
              <div className="space-y-4">
                <ConflictResolutionTable
                  conflicts={conflicts}
                  newEntries={newEntries}
                  resolutions={resolutions}
                  onResolutionChange={handleResolutionChange}
                  onSelectAll={handleSelectAll}
                />

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleDownloadConflictReport}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </button>
                    <button
                      onClick={() => setCurrentStep(STEPS.UPLOAD)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProceedWithImport}
                      disabled={isUploading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Proceed with Import
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(currentStep === STEPS.PROGRESS || currentStep === STEPS.RESULTS) && importData && (
              <ImportProgress
                importData={importData}
                onClose={handleClose}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

ImportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onImportComplete: PropTypes.func
}

export default ImportModal
