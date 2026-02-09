import { useState, useEffect, useCallback } from 'react'
import ProjectMap from '@/components/map/ProjectMap'
import { useMapStore } from '@/stores/mapStore'
import { referenceApi } from '@/services/api'
import { Map, X, Filter, RotateCcw } from 'lucide-react'

const MapView = () => {
  const [showFilters, setShowFilters] = useState(true)
  const [provinces, setProvinces] = useState([])
  const [municipalities, setMunicipalities] = useState([])
  const [districts, setDistricts] = useState([])
  const [projectTypes, setProjectTypes] = useState([])
  
  const { 
    filters, 
    setFilters, 
    clearFilters, 
    clearDistrictBounds,
    loading 
  } = useMapStore()

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [provincesRes, typesRes] = await Promise.all([
          referenceApi.getProvinces(),
          referenceApi.getProjectTypes()
        ])
        setProvinces(provincesRes.data || [])
        setProjectTypes(typesRes.data || [])
      } catch (error) {
        console.error('Error loading reference data:', error)
      }
    }
    loadReferenceData()
  }, [])

  // Load municipalities when province changes
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (filters.province) {
        try {
          const res = await referenceApi.getMunicipalities(filters.province)
          setMunicipalities(res.data || [])
        } catch (error) {
          console.error('Error loading municipalities:', error)
        }
      } else {
        setMunicipalities([])
        setFilters({ municipality: '', district: '' })
      }
    }
    loadMunicipalities()
  }, [filters.province])

  // Load districts when province changes
  useEffect(() => {
    const loadDistricts = async () => {
      if (filters.province) {
        try {
          const res = await referenceApi.getDistricts(filters.province)
          setDistricts(res.data || [])
        } catch (error) {
          console.error('Error loading districts:', error)
        }
      } else {
        setDistricts([])
      }
    }
    loadDistricts()
  }, [filters.province])

  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { [key]: value }
    
    // Reset dependent filters
    if (key === 'province') {
      newFilters.municipality = ''
      newFilters.district = ''
    }
    if (key === 'district') {
      // When district changes, clear municipality to avoid conflicts
      newFilters.municipality = ''
    }
    
    setFilters(newFilters)
  }, [setFilters])

  const handleClearFilters = useCallback(() => {
    clearDistrictBounds()
    clearFilters()
  }, [clearFilters, clearDistrictBounds])

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Done', label: 'Done' },
    { value: 'Cancelled', label: 'Cancelled' }
  ]

  return (
    <div className="h-[calc(100vh-4rem)] -m-4 lg:-m-6 flex">
      {/* Filter Panel - Sidebar */}
      <div className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </h2>
            <button
              onClick={handleClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              disabled={loading}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Clear
            </button>
          </div>

          {/* Province Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Province
            </label>
            <select
              value={filters.province}
              onChange={(e) => handleFilterChange('province', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">All Provinces</option>
              {provinces.map((province) => (
                <option key={province.id} value={province.id}>
                  {province.name}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District
            </label>
            <select
              value={filters.district}
              onChange={(e) => handleFilterChange('district', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!filters.province || loading}
            >
              <option value="">All Districts</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>

          {/* Municipality Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Municipality
            </label>
            <select
              value={filters.municipality}
              onChange={(e) => handleFilterChange('municipality', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!filters.province || loading}
            >
              <option value="">All Municipalities</option>
              {municipalities.map((municipality) => (
                <option key={municipality.id} value={municipality.id}>
                  {municipality.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Type Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Type
            </label>
            <select
              value={filters.projectType}
              onChange={(e) => handleFilterChange('projectType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">All Types</option>
              {projectTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filters Summary */}
          {(filters.province || filters.district || filters.municipality || filters.projectType || filters.status) && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Active Filters:</h3>
              <div className="flex flex-wrap gap-1">
                {filters.province && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Province
                    <button 
                      onClick={() => handleFilterChange('province', '')}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.district && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    District
                    <button 
                      onClick={() => handleFilterChange('district', '')}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.municipality && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Municipality
                    <button 
                      onClick={() => handleFilterChange('municipality', '')}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.projectType && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Type
                    <button 
                      onClick={() => handleFilterChange('projectType', '')}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Status
                    <button 
                      onClick={() => handleFilterChange('status', '')}
                      className="ml-1 hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-[1000] flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
            title="Toggle Filters"
          >
            {showFilters ? <X className="w-5 h-5 text-gray-600" /> : <Map className="w-5 h-5 text-gray-600" />}
          </button>
        </div>

        {/* Full Screen Map */}
        <div className="h-full w-full">
          <ProjectMap filters={filters} />
        </div>
      </div>
    </div>
  )
}

export default MapView
