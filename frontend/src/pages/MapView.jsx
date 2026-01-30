import { useState } from 'react'
import ProjectMap from '@/components/map/ProjectMap'
import ProjectFilters from '@/components/projects/ProjectFilters'
import { Map, Layers, X } from 'lucide-react'

const MapView = () => {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="h-[calc(100vh-4rem)] -m-4 lg:-m-6 flex">
      {/* Filter Panel - Overlay on mobile, sidebar on desktop */}
      <div className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-80 flex-shrink-0`}>
        <div className="h-full bg-white border-r border-gray-200 lg:bg-transparent lg:border-0">
          <ProjectFilters />
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-[1000] flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden bg-white p-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
            title="Toggle Filters"
          >
            {showFilters ? <X className="w-5 h-5 text-gray-600" /> : <Map className="w-5 h-5 text-gray-600" />}
          </button>
        </div>

        {/* Full Screen Map */}
        <div className="h-full w-full">
          <ProjectMap />
        </div>
      </div>
    </div>
  )
}

export default MapView
