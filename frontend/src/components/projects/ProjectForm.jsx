import { useState, useEffect, useCallback } from 'react'
import { X, MapPin, Save, Loader2 } from 'lucide-react'
import PropTypes from 'prop-types'
import { api } from '@/services/api'

const ProjectForm = ({ project, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    site_code: '',
    project_type: '',
    site_name: '',
    province_id: '',
    municipality_id: '',
    barangay_id: '',
    latitude: '',
    longitude: '',
    activation_date: '',
    status: 'Pending',
    remarks: ''
  })
  
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [referenceData, setReferenceData] = useState({
    projectTypes: [],
    provinces: [],
    municipalities: [],
    barangays: []
  })

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [typesRes, provincesRes] = await Promise.all([
          api.getProjectTypes(),
          api.getProvinces()
        ])
        setReferenceData(prev => ({
          ...prev,
          projectTypes: typesRes.data || [],
          provinces: provincesRes.data || []
        }))
      } catch (error) {
        console.error('Failed to load reference data:', error)
      }
    }
    loadReferenceData()
  }, [])

  // Load municipalities when province changes
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (formData.province_id) {
        try {
          const response = await api.getMunicipalities(formData.province_id)
          setReferenceData(prev => ({ ...prev, municipalities: response.data || [] }))
        } catch (error) {
          console.error('Failed to load municipalities:', error)
        }
      } else {
        setReferenceData(prev => ({ ...prev, municipalities: [] }))
      }
    }
    loadMunicipalities()
  }, [formData.province_id])

  // Load barangays when municipality changes
  useEffect(() => {
    const loadBarangays = async () => {
      if (formData.municipality_id) {
        try {
          const response = await api.getBarangays(formData.municipality_id)
          setReferenceData(prev => ({ ...prev, barangays: response.data || [] }))
        } catch (error) {
          console.error('Failed to load barangays:', error)
        }
      } else {
        setReferenceData(prev => ({ ...prev, barangays: [] }))
      }
    }
    loadBarangays()
  }, [formData.municipality_id])

  // Populate form when editing
  useEffect(() => {
    if (project) {
      setFormData({
        site_code: project.site_code || '',
        project_type: project.project_type || '',
        site_name: project.site_name || '',
        province_id: project.province_id || '',
        municipality_id: project.municipality_id || '',
        barangay_id: project.barangay_id || '',
        latitude: project.latitude || '',
        longitude: project.longitude || '',
        activation_date: project.activation_date ? project.activation_date.split('T')[0] : '',
        status: project.status || 'Pending',
        remarks: project.remarks || ''
      })
    }
  }, [project])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.site_code.trim()) {
      newErrors.site_code = 'Site code is required'
    } else if (!/^[A-Z0-9-]+$/i.test(formData.site_code)) {
      newErrors.site_code = 'Site code should only contain letters, numbers, and hyphens'
    }
    
    if (!formData.project_type) {
      newErrors.project_type = 'Project type is required'
    }
    
    if (!formData.site_name.trim()) {
      newErrors.site_name = 'Site name is required'
    }
    
    if (!formData.province_id) {
      newErrors.province_id = 'Province is required'
    }
    
    if (!formData.municipality_id) {
      newErrors.municipality_id = 'Municipality is required'
    }
    
    if (formData.latitude && (formData.latitude < 4 || formData.latitude > 21)) {
      newErrors.latitude = 'Latitude must be between 4°N and 21°N (Philippines)'
    }
    
    if (formData.longitude && (formData.longitude < 116 || formData.longitude > 127)) {
      newErrors.longitude = 'Longitude must be between 116°E and 127°E (Philippines)'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    try {
      const dataToSubmit = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      }
      
      await onSave(dataToSubmit)
      onClose()
    } catch (error) {
      console.error('Failed to save project:', error)
      setErrors({ submit: 'Failed to save project. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      // Reset dependent fields
      if (name === 'province_id') {
        newData.municipality_id = ''
        newData.barangay_id = ''
      }
      if (name === 'municipality_id') {
        newData.barangay_id = ''
      }
      return newData
    })
    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }))
        },
        (error) => {
          console.error('Geolocation error:', error)
          alert('Unable to get current location. Please enter coordinates manually.')
        }
      )
    } else {
      alert('Geolocation is not supported by your browser.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {project ? 'Edit Project' : 'Add New Project'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="site_code"
                value={formData.site_code}
                onChange={handleChange}
                placeholder="e.g., DICT-MNL-001"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.site_code ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.site_code && (
                <p className="mt-1 text-xs text-red-600">{errors.site_code}</p>
              )}
            </div>

            {/* Project Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Type <span className="text-red-500">*</span>
              </label>
              <select
                name="project_type"
                value={formData.project_type}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.project_type ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Type</option>
                {referenceData.projectTypes.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.project_type && (
                <p className="mt-1 text-xs text-red-600">{errors.project_type}</p>
              )}
            </div>

            {/* Site Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="site_name"
                value={formData.site_name}
                onChange={handleChange}
                placeholder="Enter site name"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.site_name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.site_name && (
                <p className="mt-1 text-xs text-red-600">{errors.site_name}</p>
              )}
            </div>

            {/* Province */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Province <span className="text-red-500">*</span>
              </label>
              <select
                name="province_id"
                value={formData.province_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.province_id ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Province</option>
                {referenceData.provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
              {errors.province_id && (
                <p className="mt-1 text-xs text-red-600">{errors.province_id}</p>
              )}
            </div>

            {/* Municipality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Municipality <span className="text-red-500">*</span>
              </label>
              <select
                name="municipality_id"
                value={formData.municipality_id}
                onChange={handleChange}
                disabled={!formData.province_id}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.municipality_id ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Municipality</option>
                {referenceData.municipalities.map((municipality) => (
                  <option key={municipality.id} value={municipality.id}>
                    {municipality.name}
                  </option>
                ))}
              </select>
              {errors.municipality_id && (
                <p className="mt-1 text-xs text-red-600">{errors.municipality_id}</p>
              )}
            </div>

            {/* Barangay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barangay
              </label>
              <select
                name="barangay_id"
                value={formData.barangay_id}
                onChange={handleChange}
                disabled={!formData.municipality_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Barangay</option>
                {referenceData.barangays.map((barangay) => (
                  <option key={barangay.id} value={barangay.id}>
                    {barangay.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {['Pending', 'In Progress', 'Done', 'Cancelled'].map((status) => (
                  <label key={status} className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={formData.status === status}
                      onChange={handleChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-1 text-sm text-gray-700">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Coordinates */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coordinates
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    placeholder="Latitude"
                    step="any"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.latitude ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.latitude && (
                    <p className="mt-1 text-xs text-red-600">{errors.latitude}</p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    placeholder="Longitude"
                    step="any"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.longitude ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.longitude && (
                    <p className="mt-1 text-xs text-red-600">{errors.longitude}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                <MapPin className="w-4 h-4 mr-1" />
                Use current location
              </button>
            </div>

            {/* Activation Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activation Date
              </label>
              <input
                type="date"
                name="activation_date"
                value={formData.activation_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Remarks */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows="3"
                placeholder="Additional notes or remarks..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {project ? 'Update' : 'Create'} Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

ProjectForm.propTypes = {
  project: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
}

ProjectForm.defaultProps = {
  project: null
}

export default ProjectForm
