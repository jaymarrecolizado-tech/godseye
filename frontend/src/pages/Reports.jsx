import { useEffect, useState, useMemo } from 'react'
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
  Area, AreaChart
} from 'recharts'
import { 
  FileText, Download, Calendar, MapPin, Activity,
  CheckCircle2, Clock, FolderOpen, TrendingUp, Users,
  Filter, ChevronDown, Loader2
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

const Reports = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [selectedProvince, setSelectedProvince] = useState('')
  const [provinces, setProvinces] = useState([])
  
  // Report data states
  const [summary, setSummary] = useState(null)
  const [statusData, setStatusData] = useState([])
  const [locationData, setLocationData] = useState([])
  const [timelineData, setTimelineData] = useState([])
  const [projectTypeData, setProjectTypeData] = useState([])
  const [performanceData, setPerformanceData] = useState(null)

  // Fetch provinces for filter
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await referenceApi.getProvinces()
        setProvinces(response.data || [])
      } catch (err) {
        console.error('Failed to fetch provinces:', err)
      }
    }
    fetchProvinces()
  }, [])

  // Fetch all report data
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      setError(null)
      
      const params = {}
      if (dateRange.from) params.date_from = dateRange.from
      if (dateRange.to) params.date_to = dateRange.to
      
      try {
        // Fetch all reports in parallel
        const [
          summaryRes,
          statusRes,
          locationRes,
          timelineRes,
          typeRes,
          perfRes
        ] = await Promise.all([
          reportsApi.getStats(),
          reportsApi.getSummaryByStatus(),
          reportsApi.getSummaryByProvince(),
          reportsApi.getMonthlyTrend(),
          reportsApi.getSummaryByType(),
          reportsApi.getPerformance()
        ])
        
        setSummary(summaryRes.data)
        setStatusData(statusRes.data?.breakdown || [])
        setLocationData(locationRes.data?.locations || [])
        setTimelineData(timelineRes.data?.trend || [])
        setProjectTypeData(typeRes.data?.project_types || [])
        setPerformanceData(perfRes.data)
      } catch (err) {
        setError(err.message || 'Failed to load reports')
        console.error('Reports fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchReports()
  }, [dateRange])

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

  const handleExport = () => {
    // Placeholder for export functionality
    alert('Export functionality will be implemented soon!')
  }

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

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

  if (loading) {
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
        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => handleDateRangeChange('from', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="From"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => handleDateRangeChange('to', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="To"
          />
          
          <div className="flex items-center space-x-2 ml-4">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Location:</span>
          </div>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Provinces</option>
            {provinces.map(province => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Dashboard */}
      <section>
        <SectionTitle title="Summary Dashboard" icon={Activity} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Projects"
            value={summary?.summary?.total_projects?.toLocaleString() || 0}
            icon={FolderOpen}
            color="blue"
          />
          <StatCard
            title="Completion Rate"
            value={`${summary?.summary?.completion_rate || 0}%`}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            title="Active Projects"
            value={(summary?.summary?.in_progress || 0).toLocaleString()}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="Provinces Covered"
            value={summary?.summary?.provinces_with_projects || 0}
            icon={MapPin}
            color="purple"
          />
        </div>
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <section className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <SectionTitle title="Status Distribution" icon={PieChart} />
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
                    formatter={(value) => [`${value.toFixed(1)} days`, 'Avg. Time']}
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
