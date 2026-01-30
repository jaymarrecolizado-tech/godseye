import { useState, useRef, useCallback } from 'react'
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react'
import PropTypes from 'prop-types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const CSVUploader = ({ onUpload, isUploading = false, uploadProgress = 0 }) => {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const validateFile = (file) => {
    // Check file type
    const validTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'text/plain'
    ]
    const isCSV = validTypes.includes(file.type) || 
                  file.name.toLowerCase().endsWith('.csv')
    
    if (!isCSV) {
      return 'Please upload a CSV file only'
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB limit'
    }

    return null
  }

  const handleFile = (file) => {
    setError(null)
    
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = (e) => {
    e.preventDefault()
    
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleButtonClick = () => {
    inputRef.current?.click()
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleUpload = () => {
    if (selectedFile && !isUploading) {
      onUpload?.(selectedFile)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
          ${selectedFile ? 'bg-green-50 border-green-300' : ''}
          ${error ? 'bg-red-50 border-red-300' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
          disabled={isUploading}
        />

        {!selectedFile ? (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drag and drop your CSV file here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or{' '}
                <button
                  type="button"
                  onClick={handleButtonClick}
                  disabled={isUploading}
                  className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  browse files
                </button>
              </p>
            </div>
            <p className="text-xs text-gray-400">
              CSV files only, max 10MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex items-center justify-center space-x-2">
              <File className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">{selectedFile.name}</span>
              <span className="text-sm text-gray-500">({formatFileSize(selectedFile.size)})</span>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-sm text-red-600 hover:text-red-700 flex items-center justify-center mx-auto"
              >
                <X className="w-4 h-4 mr-1" />
                Remove file
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Uploading...</span>
            <span className="font-medium text-gray-900">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className={`
          w-full py-3 px-4 rounded-lg font-medium transition-colors
          ${selectedFile && !isUploading
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {isUploading ? 'Uploading...' : 'Start Import'}
      </button>
    </div>
  )
}

CSVUploader.propTypes = {
  onUpload: PropTypes.func.isRequired,
  isUploading: PropTypes.bool,
  uploadProgress: PropTypes.number
}

export default CSVUploader
