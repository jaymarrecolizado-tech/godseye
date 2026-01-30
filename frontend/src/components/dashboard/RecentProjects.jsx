import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { format } from 'date-fns'

const RecentProjects = () => {
  const { projects, loading, fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Get 5 most recent projects (sorted by updated_at or created_at)
  const recentProjects = [...projects]
    .sort((a, b) => {
      const dateA = new Date(b.updated_at || b.created_at || 0)
      const dateB = new Date(a.updated_at || a.created_at || 0)
      return dateA - dateB
    })
    .slice(0, 5)

  const getStatusBadgeClass = (status) => {
    const key = status?.toLowerCase().replace(/\s+/g, '')
    switch (key) {
      case 'done':
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'inprogress':
      case 'in-progress':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeBadgeClass = (type) => {
    const key = type?.toLowerCase().replace(/[^a-z]/g, '')
    switch (key) {
      case 'wifi':
        return 'bg-green-100 text-green-800'
      case 'pnpki':
        return 'bg-red-100 text-red-800'
      case 'iidb':
        return 'bg-blue-100 text-blue-800'
      case 'elgu':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
        </div>
        <div className="p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center py-3 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-lg mr-4"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Projects</h3>
          <p className="text-sm text-gray-500 mt-1">Latest added or updated projects</p>
        </div>
        <Link 
          to="/projects"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          View All
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
      
      <div className="divide-y divide-gray-100">
        {recentProjects.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No projects found
          </div>
        ) : (
          recentProjects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-gray-500">
                      {project.site_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeClass(project.project_type)}`}>
                      {project.project_type}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {project.site_name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {project.municipality}, {project.province}
                  </p>
                </div>
                
                <div className="flex flex-col items-end ml-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(project.status)}`}>
                    {project.status}
                  </span>
                  <div className="flex items-center text-xs text-gray-400 mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(project.updated_at || project.created_at)}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default RecentProjects
