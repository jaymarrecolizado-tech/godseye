import { useState, useEffect, useCallback } from 'react'
import { Search, X, Filter, ChevronDown } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { api } from '@/services/api'

const ProjectFilters = () => {
  const { filters, setFilters, clearFilters } = useProjectStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [provinces, setProvinces] = useState([])
  const [municipalities, setMunicipalities] = useState([])
  const [projectTypes, setProjectTypes] = useState([])
  const [localFilters, setLocalFilters] = useState({
    search: '',
    status: [],
    projectType: '',
    province: '',
    municipality: '',
    dateFrom: '',
    dateTo: ''
  })

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [provincesRes, typesRes] = await Promise.all([
          api.getProvinces(),
          api.getProjectTypes()
        ])
        setProvinces(provincesRes.data || [])
        setProjectTypes(typesRes.data || [])
      } catch (error) {
        console.error('Failed to load reference data:', error)
      }
    }
    loadReferenceData()
  }, [])

  // Load municipalities when province changes
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (localFilters.province) {
        try {
          const response = await api.getMunicipalities(localFilters.province)
          setMunicipalities(response.data || [])
        } catch (error) {
          console.error('Failed to load municipalities:', error)
          setMunicipalities([])
        }
      } else {
        setMunicipalities([])
      }
    }
    loadMunicipalities()
  }, [localFilters.province])

  // Apply filters with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(localFilters)
    }, 300)
    return () => clearTimeout(timer)
  }, [localFilters, setFilters])

  const handleClearFilters = () => {
    setLocalFilters({
      search: '',
      status: [],
      projectType: '',
      province: '',
      municipality: '',
      dateFrom: '',
      dateTo: ''
    })
    clearFilters()
  }

  const handleStatusChange = (status) => {
    setLocalFilters(prev => {
      const newStatus = prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
      return { ...prev, status: newStatus }
    })
  }

  const hasActiveFilters = 
    localFilters.search || 
    localFilters.status.length > 0 || 
    localFilters.projectType || 
    localFilters.province || 
    localFilters.municipality ||
    localFilters.dateFrom ||
    localFilters.dateTo

  const statusOptions = ['Pending', 'In Progress', 'Done', 'Cancelled']

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden p-1 rounded hover:bg-gray-100"
          >
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Content */}
      <div className={`p-4 space-y-4 ${isExpanded ? 'block' : 'hidden lg:block'}`}>
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Site code or name..."
              value={localFilters.search}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="space-y-2">
            {statusOptions.map((status) => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.status.includes(status)}
                  onChange={() => handleStatusChange(status)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{status}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Project Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Type
          </label>
          <select
            value={localFilters.projectType}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, projectType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            {projectTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Province */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Province
          </label>
          <select
            value={localFilters.province}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, province: e.target.value, municipality: '' }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Provinces</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </div>

        {/* Municipality */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Municipality
          </label>
          <select
            value={localFilters.municipality}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, municipality: e.target.value }))}
            disabled={!localFilters.province}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">All Municipalities</option>
            {municipalities.map((municipality) => (
              <option key={municipality.id} value={municipality.id}>
                {municipality.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Activation Date Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={localFilters.dateFrom}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="From"
            />
            <input
              type="date"
              value={localFilters.dateTo}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="To"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectFilters
