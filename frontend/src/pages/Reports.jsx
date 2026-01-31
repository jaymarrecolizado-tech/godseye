import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  Area, AreaChart
} from 'recharts'
import {
  FileText, Download, Calendar, MapPin, Activity,
  CheckCircle2, Clock, FolderOpen, TrendingUp, Users,
  Filter, ChevronDown, Loader2, FileSpreadsheet, FileIcon,
  X, LayoutGrid, List, BarChart3, PieChart as PieChartIcon,
  RefreshCw, RotateCcw
} from 'lucide-react'
import { reportsApi, referenceApi } from '@/services/api'

// Status colors mapping
const statusColors = {
  'Done': '#22c55e',
  'Completed': '#22c55e',
  'In Progress': '#3b82f6',
  'Pending': '#eab308',
  'Cancelled': '#ef4444',
  'On Hold': '#f97316',
  'Unknown': '#6b7280'
}

// Project type colors
const typeColors = {
  'Free-WIFI': '#22c55e',
  'WiFi': '#22c55e',
  'PNPKI': '#ef4444',
  'IIDB': '#3b82f6',
  'eLGU': '#eab308',
  'default': '#6b7280'
}

// Group by options
const groupByOptions = [
  { value: 'none', label: 'None (Flat List)', icon: List },
  { value: 'province', label: 'Province', icon: MapPin },
  { value: 'municipality', label: 'Municipality', icon: MapPin },
  { value: 'district', label: 'District', icon: LayoutGrid },
  { value: 'project_type', label: 'Project Type', icon: FolderOpen },
  { value: 'status', label: 'Status', icon: Activity },
  { value: 'activation_month', label: 'Activation Month', icon: Calendar }
]

// Status options for multi-select
const statusOptions = [
  { value: 'Pending', label: 'Pending', color: '#eab308' },
  { value: 'In Progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'Done', label: 'Done', color: '#22c55e' },
  { value: 'Cancelled', label: 'Cancelled', color: '#ef4444' },
  { value: 'On Hold', label: 'On Hold', color: '#f97316' }
]

const Reports = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Filter states
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedMunicipality, setSelectedMunicipality] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [selectedProjectType, setSelectedProjectType] = useState('')
  const [groupBy, setGroupBy] = useState('none')
  
  // Reference data
  const [provinces, setProvinces] = useState([])
  const [municipalities, setMunicipalities] = useState([])
  const [districts, setDistricts] = useState([])
  const [projectTypes, setProjectTypes] = useState([])
  
  // UI states
  const [showFilters, setShowFilters] = useState(true)
  const [filtersLoading, setFiltersLoading] = useState(false)
  
  // Export states
  const [exportFormat, setExportFormat] = useState('csv')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState(null)
  const exportDropdownRef = useRef(null)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [showPDFDropdown, setShowPDFDropdown] = useState(false)
  const pdfDropdownRef = useRef(null)
  
  // Report data states
  const [summary, setSummary] = useState(null)
  const [statusData, setStatusData] = useState([])
  const [locationData, setLocationData] = useState([])
  const [timelineData, setTimelineData] = useState([])
  const [projectTypeData, setProjectTypeData] = useState([])
  const [performanceData, setPerformanceData] = useState(null)
  const [customReportData, setCustomReportData] = useState(null)

  // Fetch provinces and project types for filters
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [provincesRes, typesRes] = await Promise.all([
          referenceApi.getProvinces(),
          referenceApi.getProjectTypes()
        ])
        setProvinces(provincesRes.data || [])
        setProjectTypes(typesRes.data || [])
      } catch (err) {
        console.error('Failed to fetch reference data:', err)
      }
    }
    fetchReferenceData()
  }, [])

  // Fetch municipalities when province changes
  useEffect(() => {
    const fetchMunicipalities = async () => {
      if (!selectedProvince) {
        setMunicipalities([])
        setSelectedMunicipality('')
        return
      }
      try {
        const response = await referenceApi.getMunicipalities(selectedProvince)
        setMunicipalities(response.data || [])
      } catch (err) {
        console.error('Failed to fetch municipalities:', err)
        setMunicipalities([])
      }
    }
    fetchMunicipalities()
  }, [selectedProvince])

  // Fetch districts when province changes
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!selectedProvince) {
        setDistricts([])
        setSelectedDistrict('')
        return
      }
      try {
        const response = await referenceApi.getDistricts(selectedProvince)
        setDistricts(response.data || [])
      } catch (err) {
        console.error('Failed to fetch districts:', err)
        setDistricts([])
      }
    }
    fetchDistricts()
  }, [selectedProvince])

  // Build filter params
  const buildFilterParams = useCallback(() => {
    const params = {}
    if (dateRange.from) params.date_from = dateRange.from
    if (dateRange.to) params.date_to = dateRange.to
    if (selectedProvince) params.province_id = selectedProvince
    if (selectedMunicipality) params.municipality_id = selectedMunicipality
    if (selectedDistrict) params.district_id = selectedDistrict
    if (selectedStatuses.length > 0) params.status = selectedStatuses.join(',')
    if (selectedProjectType) params.project_type_id = selectedProjectType
    return params
  }, [dateRange, selectedProvince, selectedMunicipality, selectedDistrict, selectedStatuses, selectedProjectType])

  // Fetch all report data
  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    const params = buildFilterParams()
    
    try {
      // Fetch all reports in parallel
      const [
        summaryRes,
        statusRes,
        locationRes,
        timelineRes,
        typeRes,
        perfRes,
        customRes
      ] = await Promise.all([
        reportsApi.getStats(params),
        reportsApi.getSummaryByStatus(params),
        reportsApi.getSummaryByProvince({ ...params, level: 'province' }),
        reportsApi.getMonthlyTrend(params),
        reportsApi.getSummaryByType(params),
        reportsApi.getPerformance(params),
        reportsApi.getCustomReport({ ...params, group_by: groupBy, limit: 100 })
      ])
      
      setSummary(summaryRes.data)
      setStatusData(statusRes.data?.breakdown || [])
      setLocationData(locationRes.data?.locations || [])
      setTimelineData(timelineRes.data?.timeline || [])
      setProjectTypeData(typeRes.data?.project_types || [])
      setPerformanceData(perfRes.data)
      setCustomReportData(customRes.data)
    } catch (err) {
      setError(err.message || 'Failed to load reports')
      console.error('Reports fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [buildFilterParams, groupBy])

  // Fetch reports when filters change
  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  // Debounced filter change handler
  const handleFilterChange = useCallback(() => {
    setFiltersLoading(true)
    const timer = setTimeout(() => {
      fetchReports()
      setFiltersLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchReports])

  // Clear all filters
  const clearFilters = () => {
    setDateRange({ from: '', to: '' })
    setSelectedProvince('')
    setSelectedMunicipality('')
    setSelectedDistrict('')
    setSelectedStatuses([])
    setSelectedProjectType('')
    setGroupBy('none')
  }

  // Toggle status selection
  const toggleStatus = (status) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  // Get active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (dateRange.from || dateRange.to) count++
    if (selectedProvince) count++
    if (selectedMunicipality) count++
    if (selectedDistrict) count++
    if (selectedStatuses.length > 0) count++
    if (selectedProjectType) count++
    return count
  }, [dateRange, selectedProvince, selectedMunicipality, selectedDistrict, selectedStatuses, selectedProjectType])

  // Prepare chart data
  const statusChartData = useMemo(() => {
    return statusData.map(item => ({
      name: item.status || item.project_type || 'Unknown',
      value: item.count || item.total || 0,
      color: statusColors[item.status] || typeColors[item.project_type] || statusColors['Unknown']
    }))
  }, [statusData])

  const locationChartData = useMemo(() => {
    return locationData.slice(0, 10).map(item => ({
      name: item.province || item.municipality || 'Unknown',
      total: item.total_projects || 0,
      completed: item.completed || 0,
      pending: item.pending || 0,
      inProgress: item.in_progress || 0
    }))
  }, [locationData])

  const typeChartData = useMemo(() => {
    return projectTypeData.map(item => ({
      name: item.name || 'Unknown',
      total: item.total_projects || 0,
      completed: item.completed || 0,
      completionRate: item.completion_rate || 0,
      color: item.color_code || typeColors[item.name] || typeColors['default']
    }))
  }, [projectTypeData])

  const timelineChartData = useMemo(() => {
    return timelineData.map(item => ({
      period: item.month || item.period || '',
      count: item.count || item.total_created || 0,
      completed: item.completed || 0
    }))
  }, [timelineData])

  // Custom report table data
  const customReportGroups = useMemo(() => {
    return customReportData?.groups || []
  }, [customReportData])

  const handleExport = async () => {
    setExportLoading(true)
    setExportError(null)
    
    try {
      const params = buildFilterParams()
      
      // Call appropriate export API
      const response = exportFormat === 'csv'
        ? await reportsApi.exportCSV(params)
        : await reportsApi.exportExcel(params)
      
      // Create blob from response
      const blob = new Blob([response], {
        type: exportFormat === 'csv'
          ? 'text/csv;charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const extension = exportFormat === 'csv' ? 'csv' : 'xlsx'
      link.download = `project_report_${timestamp}.${extension}`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      window.URL.revokeObjectURL(url)
      
      // Close dropdown
      setShowExportDropdown(false)
      
    } catch (err) {
      console.error('Export failed:', err)
      setExportError(err.message || 'Failed to export report. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  const handlePDFExport = async (reportType) => {
    setExportLoading(true)
    setExportError(null)
    
    try {
      const params = buildFilterParams()
      
      // Call appropriate PDF export API based on report type
      let response
      switch (reportType) {
        case 'summary':
          response = await reportsApi.exportSummaryPDF(params)
          break
        case 'status':
          response = await reportsApi.exportStatusPDF(params)
          break
        case 'location':
          response = await reportsApi.exportLocationPDF(params)
          break
        case 'projects':
          response = await reportsApi.exportProjectsPDF(params)
          break
        case 'custom':
          response = await reportsApi.exportCustomReportPDF({ ...params, group_by: groupBy })
          break
        default:
          response = await reportsApi.exportSummaryPDF(params)
      }
      
      // Create blob from response
      const blob = new Blob([response], { type: 'application/pdf' })
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      link.download = `${reportType}_report_${timestamp}.pdf`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      window.URL.revokeObjectURL(url)
      
      // Close dropdown
      setShowPDFDropdown(false)
      
    } catch (err) {
      console.error('PDF Export failed:', err)
      setExportError(err.message || 'Failed to export PDF report. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false)
      }
      if (pdfDropdownRef.current && !pdfDropdownRef.current.contains(event.target)) {
        setShowPDFDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <div className={`bg-${color}-50 text-${color}-600 p-3 rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )

  const SectionTitle = ({ title, icon: Icon }) => (
    <div className="flex items-center space-x-2 mb-4">
      <Icon className="w-5 h-5 text-blue-600" />
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
  )

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-gray-600">
              {entry.name}: <span className="font-medium" style={{ color: entry.color }}>
                {entry.value}
              </span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
        <span className="text-gray-600">Loading reports...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={fetchReports}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* PDF Export Dropdown */}
          <div className="relative" ref={pdfDropdownRef}>
            <button
              onClick={() => setShowPDFDropdown(!showPDFDropdown)}
              disabled={exportLoading}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportLoading && showPDFDropdown ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileIcon className="w-4 h-4 mr-2" />
                  Export PDF
                  <ChevronDown className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
            
            {showPDFDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Select Report Type</h3>
                  
                  <button
                    onClick={() => handlePDFExport('summary')}
                    disabled={exportLoading}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Activity className="w-4 h-4 text-blue-600" />
                    Dashboard Summary
                  </button>
                  
                  <button
                    onClick={() => handlePDFExport('status')}
                    disabled={exportLoading}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Status Breakdown
                  </button>
                  
                  <button
                    onClick={() => handlePDFExport('location')}
                    disabled={exportLoading}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-purple-600" />
                    Location Report
                  </button>
                  
                  <button
                    onClick={() => handlePDFExport('projects')}
                    disabled={exportLoading}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4 text-orange-600" />
                    Project List
                  </button>
                  
                  <button
                    onClick={() => handlePDFExport('custom')}
                    disabled={exportLoading}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-100 pt-2"
                  >
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    Custom Grouped Report
                  </button>
                  
                  {exportError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                      {exportError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        
          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={exportLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                  <ChevronDown className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
            
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Export Options</h3>
                  
                  {/* Format Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Export Format
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExportFormat('csv')}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                          exportFormat === 'csv'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        CSV
                      </button>
                      <button
                        onClick={() => setExportFormat('excel')}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                          exportFormat === 'excel'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel
                      </button>
                    </div>
                  </div>
                  
                  {/* Export Button */}
                  <button
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {exportLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download {exportFormat.toUpperCase()}
                      </>
                    )}
                  </button>
                  
                  {exportError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {exportError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Filters & Grouping</span>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                {activeFiltersCount} active
              </span>
            )}
            {filtersLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearFilters()
                }}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            )}
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </div>
        </div>
        
        {showFilters && (
          <div className="p-4 space-y-4">
            {/* First Row - Date Range */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
              </div>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="From"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="To"
              />
            </div>

            {/* Second Row - Location Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  Province
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Provinces</option>
                  {provinces.map(province => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Municipality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  Municipality
                </label>
                <select
                  value={selectedMunicipality}
                  onChange={(e) => setSelectedMunicipality(e.target.value)}
                  disabled={!selectedProvince}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">{selectedProvince ? 'All Municipalities' : 'Select Province First'}</option>
                  {municipalities.map(municipality => (
                    <option key={municipality.id} value={municipality.id}>
                      {municipality.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <LayoutGrid className="w-3 h-3 inline mr-1" />
                  District
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!selectedProvince}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">{selectedProvince ? 'All Districts' : 'Select Province First'}</option>
                  {districts.map(district => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Third Row - Status and Project Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Multi-select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Activity className="w-3 h-3 inline mr-1" />
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(status => (
                    <button
                      key={status.value}
                      onClick={() => toggleStatus(status.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedStatuses.includes(status.value)
                          ? 'ring-2 ring-offset-1'
                          : 'hover:bg-gray-100'
                      }`}
                      style={{
                        backgroundColor: selectedStatuses.includes(status.value) ? status.color + '20' : '#f3f4f6',
                        color: selectedStatuses.includes(status.value) ? status.color : '#6b7280',
                        ringColor: selectedStatuses.includes(status.value) ? status.color : 'transparent'
                      }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full inline-block mr-1.5"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.label}
                      {selectedStatuses.includes(status.value) && (
                        <X className="w-3 h-3 inline ml-1.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FolderOpen className="w-3 h-3 inline mr-1" />
                  Project Type
                </label>
                <select
                  value={selectedProjectType}
                  onChange={(e) => setSelectedProjectType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  {projectTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fourth Row - Group By */}
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BarChart3 className="w-3 h-3 inline mr-1" />
                Group Report By
              </label>
              <div className="flex flex-wrap gap-2">
                {groupByOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setGroupBy(option.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      groupBy === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Dashboard */}
      <section>
        <SectionTitle title="Summary Dashboard" icon={Activity} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Projects"
            value={customReportData?.summary?.total_projects?.toLocaleString() || summary?.summary?.total_projects?.toLocaleString() || 0}
            icon={FolderOpen}
            color="blue"
          />
          <StatCard
            title="Completion Rate"
            value={`${customReportData?.summary?.completion_rate || summary?.summary?.completion_rate || 0}%`}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            title="Active Projects"
            value={(customReportData?.summary?.in_progress || summary?.summary?.in_progress || 0).toLocaleString()}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="Provinces Covered"
            value={customReportData?.summary?.provinces_count || customReportData?.summary?.provinces_with_projects || summary?.summary?.provinces_with_projects || 0}
            icon={MapPin}
            color="purple"
          />
        </div>
      </section>

      {/* Custom Grouped Report Section */}
      {groupBy !== 'none' && customReportData && (
        <section className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle 
              title={`Grouped by ${groupByOptions.find(o => o.value === groupBy)?.label || groupBy}`} 
              icon={BarChart3} 
            />
            <span className="text-sm text-gray-500">
              {customReportGroups.length} groups • {customReportData.summary?.total_projects || 0} total projects
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Group</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Pending</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">In Progress</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Done</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Completion %</th>
                </tr>
              </thead>
              <tbody>
                {customReportGroups.map((group, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {group.color_code && (
                          <span 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: group.color_code }}
                          />
                        )}
                        <div>
                          <span className="font-medium text-gray-900">{group.group_name}</span>
                          {group.province_name && (
                            <span className="text-xs text-gray-500 block">{group.province_name}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-semibold">{group.total || 0}</td>
                    <td className="text-right py-3 px-4 text-yellow-600">{group.pending || 0}</td>
                    <td className="text-right py-3 px-4 text-blue-600">{group.in_progress || 0}</td>
                    <td className="text-right py-3 px-4 text-green-600">{group.done || 0}</td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min(group.completion_rate || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-10">
                          {Number(group.completion_rate || 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <section className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <SectionTitle title="Status Distribution" icon={PieChartIcon} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Status Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-700">Status</th>
                  <th className="text-right py-2 font-medium text-gray-700">Count</th>
                  <th className="text-right py-2 font-medium text-gray-700">%</th>
                </tr>
              </thead>
              <tbody>
                {statusData.map((item, index) => {
                  const count = item.count || item.total || 0
                  const total = statusData.reduce((sum, s) => sum + (s.count || s.total || 0), 0)
                  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0
                  const name = item.status || item.project_type || 'Unknown'
                  const color = statusColors[item.status] || typeColors[item.project_type] || statusColors['Unknown']
                  
                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
                        {name}
                      </td>
                      <td className="text-right py-2">{count}</td>
                      <td className="text-right py-2">{percentage}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Projects by Type */}
        <section className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <SectionTitle title="Projects by Type" icon={FolderOpen} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Type Summary */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            {typeChartData.slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-semibold">{item.total}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Projects by Location */}
      <section className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <SectionTitle title="Projects by Location (Top 10 Provinces)" icon={MapPin} />
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={locationChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="#22c55e" name="Completed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" fill="#eab308" name="Pending" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Location Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {summary?.summary?.provinces_with_projects || 0}
            </p>
            <p className="text-sm text-gray-600">Provinces with Projects</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {summary?.summary?.municipalities_with_projects || 0}
            </p>
            <p className="text-sm text-gray-600">Municipalities</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {summary?.summary?.active_project_types || 0}
            </p>
            <p className="text-sm text-gray-600">Active Project Types</p>
          </div>
        </div>
      </section>

      {/* Timeline Analysis */}
      <section className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <SectionTitle title="Project Activation Timeline" icon={TrendingUp} />
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineChartData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorCount)" 
                name="Total Projects"
              />
              <Area 
                type="monotone" 
                dataKey="completed" 
                stroke="#22c55e" 
                fillOpacity={1} 
                fill="url(#colorCompleted)" 
                name="Completed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Performance Metrics */}
      <section className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <SectionTitle title="Performance Metrics" icon={Activity} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completion Time by Type */}
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-4">
              Average Completion Time (Days)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={performanceData?.completion_times || []}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="project_type" type="category" width={80} />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(1)} days`, 'Avg. Time']}
                  />
                  <Bar 
                    dataKey="avg_days_to_complete" 
                    fill="#8b5cf6" 
                    radius={[0, 4, 4, 0]}
                    name="Days to Complete"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Changes */}
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-4">
              Status Change Frequency
            </h3>
            <div className="space-y-3">
              {(performanceData?.status_changes || []).map((change, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: statusColors[change.new_status] || '#6b7280' }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {change.new_status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {change.change_count}
                    </p>
                    <p className="text-xs text-gray-500">changes</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Recent Activity Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-md font-medium text-gray-800 mb-4">Recent Activity (Last 30 Days)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Projects Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {(performanceData?.recent_activity || []).reduce(
                  (sum, day) => sum + (day.projects_completed || 0), 0
                )}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Projects Created</p>
              <p className="text-2xl font-bold text-blue-600">
                {(performanceData?.recent_activity || []).reduce(
                  (sum, day) => sum + (day.projects_created || 0), 0
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-4">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  )
}

export default Reports
