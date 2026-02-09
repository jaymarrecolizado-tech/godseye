import { useState, useEffect, useCallback } from 'react'
import { X, MapPin, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import PropTypes from 'prop-types'
import { api } from '@/services/api'

const ProjectForm = ({ project, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    site_code: '',
    project_type_id: '',
    site_name: '',
    implementing_agency: '',
    budget: '',
    description: '',
    expected_output: '',
    province_id: '',
    municipality_id: '',
    barangay_id: '',
    latitude: '',
    longitude: '',
    activation_date: '',
    start_date: '',
    end_date: '',
    status: 'Pending',
    remarks: '',
    accomplishments: []
  })
  
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [referenceData, setReferenceData] = useState({
    projectTypes: [],
    provinces: [],
    municipalities: [],
    barangays: [],
    districts: []
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

  // Load districts when province changes
  useEffect(() => {
    const loadDistricts = async () => {
      if (formData.province_id) {
        try {
          const response = await api.getDistricts(formData.province_id)
          setReferenceData(prev => ({ ...prev, districts: response.data || [] }))
        } catch (error) {
          console.error('Failed to load districts:', error)
        }
      } else {
        setReferenceData(prev => ({ ...prev, districts: [] }))
      }
    }
    loadDistricts()
  }, [formData.province_id])

  // Load existing accomplishments when editing
  useEffect(() => {
    const loadAccomplishments = async () => {
      if (project?.id) {
        try {
          const response = await api.getProjectAccomplishments(project.id)
          if (response.data) {
            setFormData(prev => ({
              ...prev,
              accomplishments: response.data
            }))
          }
        } catch (error) {
          console.error('Failed to load accomplishments:', error)
        }
      }
    }
    loadAccomplishments()
  }, [project])

  // Populate form when editing
  useEffect(() => {
    if (project) {
      setFormData(prev => ({
        ...prev,
        site_code: project.site_code || '',
        project_type_id: project.project_type_id || '',
        site_name: project.site_name || '',
        implementing_agency: project.implementing_agency || '',
        budget: project.budget || '',
        description: project.description || '',
        expected_output: project.expected_output || '',
        province_id: project.province_id || '',
        municipality_id: project.municipality_id || '',
        barangay_id: project.barangay_id || '',
        latitude: project.latitude || '',
        longitude: project.longitude || '',
        activation_date: project.activation_date ? project.activation_date.split('T')[0] : '',
        start_date: project.start_date ? project.start_date.split('T')[0] : '',
        end_date: project.end_date ? project.end_date.split('T')[0] : '',
        status: project.status || 'Pending',
        remarks: project.remarks || ''
      }))
    }
  }, [project])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.site_code.trim()) {
      newErrors.site_code = 'Site code is required'
    } else if (!/^[A-Z0-9-]+$/i.test(formData.site_code)) {
      newErrors.site_code = 'Site code should only contain letters, numbers, and hyphens'
    }
    
    if (!formData.project_type_id) {
      newErrors.project_type_id = 'Project type is required'
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
    
    if (formData.budget && (isNaN(formData.budget) || formData.budget < 0)) {
      newErrors.budget = 'Budget must be a positive number'
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
        project_type_id: parseInt(formData.project_type_id),
        province_id: parseInt(formData.province_id),
        municipality_id: parseInt(formData.municipality_id),
        barangay_id: formData.barangay_id ? parseInt(formData.barangay_id) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        budget: formData.budget ? parseFloat(formData.budget) : null
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
        newData.district_id = ''
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

  // Accomplishment handlers
  const addAccomplishment = () => {
    setFormData(prev => ({
      ...prev,
      accomplishments: [
        ...prev.accomplishments,
        {
          id: Date.now(), // temporary ID for new accomplishments
          accomplishment_date: new Date().toISOString().split('T')[0],
          description: '',
          percentage_complete: 0,
          actual_output: '',
          remarks: ''
        }
      ]
    }))
  }

  const updateAccomplishment = (index, field, value) => {
    setFormData(prev => {
      const updatedAccomplishments = [...prev.accomplishments]
      updatedAccomplishments[index] = {
        ...updatedAccomplishments[index],
        [field]: value
      }
      return { ...prev, accomplishments: updatedAccomplishments }
    })
  }

  const removeAccomplishment = (index) => {
    setFormData(prev => ({
      ...prev,
      accomplishments: prev.accomplishments.filter((_, i) => i !== index)
    }))
  }

  const statusOptions = ['Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold']

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
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

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Basic Information
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Project Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('accomplishments')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'accomplishments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Accomplishments
              {formData.accomplishments.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {formData.accomplishments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
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
                  name="project_type_id"
                  value={formData.project_type_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.project_type_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Type</option>
                  {referenceData.projectTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {errors.project_type_id && (
                  <p className="mt-1 text-xs text-red-600">{errors.project_type_id}</p>
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

              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <select
                  name="district_id"
                  value={formData.district_id}
                  onChange={handleChange}
                  disabled={!formData.province_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select District</option>
                  {referenceData.districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-3">
                  {statusOptions.map((status) => (
                    <label key={status} className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={formData.status === status}
                        onChange={handleChange}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{status}</span>
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
            </div>
          )}

          {/* Project Details Tab */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Implementing Agency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Implementing Agency
                </label>
                <input
                  type="text"
                  name="implementing_agency"
                  value={formData.implementing_agency}
                  onChange={handleChange}
                  placeholder="e.g., DICT, LGU, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (PHP)
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="Enter budget amount"
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.budget ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.budget && (
                  <p className="mt-1 text-xs text-red-600">{errors.budget}</p>
                )}
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

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Project description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Expected Output */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Output
                </label>
                <textarea
                  name="expected_output"
                  value={formData.expected_output}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Expected project outputs..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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
          )}

          {/* Accomplishments Tab */}
          {activeTab === 'accomplishments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Project Accomplishments</h3>
                <button
                  type="button"
                  onClick={addAccomplishment}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Accomplishment
                </button>
              </div>

              {formData.accomplishments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No accomplishments added yet.</p>
                  <p className="text-sm">Click "Add Accomplishment" to record progress.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.accomplishments.map((acc, index) => (
                    <div key={acc.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Accomplishment #{index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeAccomplishment(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Accomplishment Date */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={acc.accomplishment_date ? acc.accomplishment_date.split('T')[0] : ''}
                            onChange={(e) => updateAccomplishment(index, 'accomplishment_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        {/* Percentage Complete */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            % Complete
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={acc.percentage_complete || 0}
                            onChange={(e) => updateAccomplishment(index, 'percentage_complete', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={acc.description || ''}
                            onChange={(e) => updateAccomplishment(index, 'description', e.target.value)}
                            rows="2"
                            placeholder="What was accomplished?"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                        </div>

                        {/* Actual Output */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Actual Output
                          </label>
                          <textarea
                            value={acc.actual_output || ''}
                            onChange={(e) => updateAccomplishment(index, 'actual_output', e.target.value)}
                            rows="2"
                            placeholder="Quantifiable results achieved..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                        </div>

                        {/* Remarks */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Remarks
                          </label>
                          <input
                            type="text"
                            value={acc.remarks || ''}
                            onChange={(e) => updateAccomplishment(index, 'remarks', e.target.value)}
                            placeholder="Additional notes..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
