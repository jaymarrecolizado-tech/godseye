import { useEffect } from 'react'
import { 
  FolderOpen, 
  CheckCircle2, 
  Clock, 
  Loader2 
} from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'

const StatsCards = () => {
  const { projects, loading, fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Calculate stats from projects
  const stats = {
    total: projects.length,
    completed: projects.filter(p => 
      p.status?.toLowerCase() === 'done' || 
      p.status?.toLowerCase() === 'completed'
    ).length,
    pending: projects.filter(p => 
      p.status?.toLowerCase() === 'pending'
    ).length,
    inProgress: projects.filter(p => 
      p.status?.toLowerCase() === 'in progress' || 
      p.status?.toLowerCase() === 'in-progress'
    ).length
  }

  const cards = [
    {
      title: 'Total Projects',
      value: stats.total,
      icon: FolderOpen,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      filter: null
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
      filter: 'done'
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
      filter: 'pending'
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: Loader2,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      filter: 'in progress'
    }
  ]

  const handleCardClick = (filter) => {
    // Navigate to projects page with filter
    if (filter) {
      window.location.href = `/projects?status=${encodeURIComponent(filter)}`
    } else {
      window.location.href = '/projects'
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
            <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <button
            key={card.title}
            onClick={() => handleCardClick(card.filter)}
            className={`bg-white rounded-xl p-6 border ${card.borderColor} shadow-sm hover:shadow-md transition-all duration-200 text-left group cursor-pointer`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className={`text-3xl font-bold ${card.textColor}`}>
                  {card.value.toLocaleString()}
                </p>
              </div>
              <div className={`${card.bgColor} ${card.textColor} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-gray-500">
              <span className="font-medium">
                {stats.total > 0 ? ((card.value / stats.total) * 100).toFixed(1) : 0}%
              </span>
              <span className="ml-1">of total projects</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default StatsCards
