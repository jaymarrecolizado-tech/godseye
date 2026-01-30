import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useProjectStore } from '@/stores/projectStore'

const StatusChart = () => {
  const { projects, loading } = useProjectStore()

  const data = useMemo(() => {
    const statusCounts = projects.reduce((acc, project) => {
      const status = project.status || 'Unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    const colors = {
      'Done': '#22c55e',
      'Completed': '#22c55e',
      'In Progress': '#3b82f6',
      'Pending': '#eab308',
      'Cancelled': '#ef4444',
      'Unknown': '#6b7280'
    }

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: colors[status] || colors['Unknown']
    }))
  }, [projects])

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0]
      const percentage = ((item.value / total) * 100).toFixed(1)
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-medium">{item.value}</span>
          </p>
          <p className="text-sm text-gray-600">
            Percentage: <span className="font-medium">{percentage}%</span>
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="spinner mr-2"></div>
          <span className="text-gray-600">Loading chart...</span>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status Distribution</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Project Status Distribution</h3>
        <span className="text-sm text-gray-500">{total} total projects</span>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value, entry) => (
                <span style={{ color: entry.color }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          {data.slice(0, 4).map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {((item.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default StatusChart
