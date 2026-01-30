import { useEffect } from 'react'
import StatsCards from '@/components/dashboard/StatsCards'
import StatusChart from '@/components/dashboard/StatusChart'
import RecentProjects from '@/components/dashboard/RecentProjects'
import ProjectMap from '@/components/map/ProjectMap'
import { useProjectStore } from '@/stores/projectStore'

const Dashboard = () => {
  const { fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of all projects and their current status
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Charts and Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusChart />
        <RecentProjects />
      </div>

      {/* Quick Map Preview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Project Locations</h2>
          <p className="text-sm text-gray-500 mt-1">Geographic distribution of projects</p>
        </div>
        <div className="h-96">
          <ProjectMap />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
