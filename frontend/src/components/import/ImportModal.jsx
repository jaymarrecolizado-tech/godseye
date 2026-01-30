import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Upload } from 'lucide-react'
import PropTypes from 'prop-types'
import CSVUploader from './CSVUploader'
import ImportProgress from './ImportProgress'
import { uploadCSV, getImportStatus } from '@/services/importApi'

const STEPS = {
  UPLOAD: 'upload',
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

  const handleUpload = async (file) => {
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const response = await uploadCSV(file, {
        skipDuplicates: true,
        updateExisting: false
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
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(
        err.response?.data?.message || 
        'Failed to upload file. Please try again.'
      )
    } finally {
      setIsUploading(false)
    }
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Upload className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Import Projects from CSV
                </h2>
                <p className="text-sm text-gray-500">
                  {currentStep === STEPS.UPLOAD && 'Upload your CSV file to get started'}
                  {currentStep === STEPS.PROGRESS && 'Processing your data...'}
                  {currentStep === STEPS.RESULTS && 'Import complete'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                {error}
              </div>
            )}

            {currentStep === STEPS.UPLOAD && (
              <CSVUploader
                onUpload={handleUpload}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />
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
