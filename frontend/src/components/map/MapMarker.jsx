import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

// Color mapping for project types
const typeColors = {
  'free-wifi': '#28a745',
  'wifi': '#28a745',
  'pnpki': '#dc3545',
  'iidb': '#007bff',
  'elgu': '#ffc107',
  'default': '#6c757d'
}

// Color mapping for status
const statusColors = {
  'done': '#22c55e',
  'completed': '#22c55e',
  'pending': '#eab308',
  'in progress': '#3b82f6',
  'in-progress': '#3b82f6',
  'cancelled': '#ef4444',
  'canceled': '#ef4444',
  'default': '#6c757d'
}

// Create custom icon based on project type
const createCustomIcon = (projectType, status, isSelected) => {
  const typeKey = projectType?.toLowerCase().replace(/[^a-z]/g, '') || 'default'
  const color = typeColors[typeKey] || typeColors.default
  const statusKey = status?.toLowerCase() || 'default'
  const statusColor = statusColors[statusKey] || statusColors.default
  
  const size = isSelected ? 32 : 24
  const strokeWidth = isSelected ? 3 : 2
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
      <!-- Marker shape -->
      <path 
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
        fill="${color}" 
        stroke="white" 
        stroke-width="${strokeWidth}"
      />
      <!-- Status indicator dot -->
      <circle 
        cx="12" 
        cy="9" 
        r="3" 
        fill="${statusColor}" 
        stroke="white" 
        stroke-width="1"
      />
    </svg>
  `
  
  return L.divIcon({
    className: 'custom-marker',
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  })
}

const MapMarker = ({ project, isSelected, onClick }) => {
  const position = [project.latitude, project.longitude]
  const icon = createCustomIcon(project.project_type, project.status, isSelected)
  
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

  return (
    <Marker 
      position={position} 
      icon={icon}
      eventHandlers={{
        click: onClick
      }}
    >
      <Popup>
        <div className="min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeClass(project.project_type)}`}>
              {project.project_type}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(project.status)}`}>
              {project.status}
            </span>
          </div>
          
          <h3 className="font-semibold text-gray-900 mb-1">
            {project.site_code}
          </h3>
          
          <p className="text-sm text-gray-600 mb-2">
            {project.site_name}
          </p>
          
          <div className="text-xs text-gray-500 space-y-1 mb-3">
            <p>
              <span className="font-medium">Location:</span> {project.municipality}, {project.province}
            </p>
            {project.barangay && (
              <p>
                <span className="font-medium">Barangay:</span> {project.barangay}
              </p>
            )}
            {project.activation_date && (
              <p>
                <span className="font-medium">Activated:</span> {new Date(project.activation_date).toLocaleDateString()}
              </p>
            )}
          </div>
          
          <Link 
            to={`/projects/${project.id}`}
            className="block w-full text-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Details
          </Link>
        </div>
      </Popup>
    </Marker>
  )
}

MapMarker.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    site_code: PropTypes.string,
    site_name: PropTypes.string,
    project_type: PropTypes.string,
    status: PropTypes.string,
    latitude: PropTypes.number.isRequired,
    longitude: PropTypes.number.isRequired,
    province: PropTypes.string,
    municipality: PropTypes.string,
    barangay: PropTypes.string,
    activation_date: PropTypes.string
  }).isRequired,
  isSelected: PropTypes.bool,
  onClick: PropTypes.func
}

MapMarker.defaultProps = {
  isSelected: false,
  onClick: () => {}
}

export default MapMarker
