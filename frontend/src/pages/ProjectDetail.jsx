import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Copy, 
  Check,
  MapPin,
  Calendar,
  FileText,
  Building2,
  Tag,
  Activity,
  Clock,
  User
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useProjectStore } from '@/stores/projectStore'
import { api } from '@/services/api'
import ProjectForm from '@/components/projects/ProjectForm'
import 'leaflet/dist/leaflet.css'

// Fix for default markers
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

// Color mapping for project types
const typeColors = {
  'free-wifi': '#28a745',
  'wifi': '#28a745',
  'pnpki': '#dc3545',
  'iidb': '#007bff',
  'elgu': '#ffc107',
  'default': '#6c757d'
}

// Get project type color
const getProjectTypeColor = (projectType) => {
  const typeKey = projectType?.toLowerCase().replace(/[^a-z]/g, '') || 'default'
  return typeColors[typeKey] || typeColors.default
}

// Status badge component
const StatusBadge = ({ status }) => {
  const getStatusBadgeClass = (status) => {
    const key = status?.toLowerCase().replace(/\s+/g, '')
    switch (key) {
      case 'done':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'inprogress':
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadgeClass(status)}`}>
      {status}
    </span>
  )
}

// Copy button component
const CopyButton = ({ text, label }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

// Info row component
const InfoRow = ({ icon: Icon, label, value, copyable = false }) => {
  if (!value) return null
  
  return (
    <div className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="flex items-center">
          <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
          {copyable && <CopyButton text={value} label={label} />}
        </div>
      </div>
    </div>
  )
}

// Status history item component
const HistoryItem = ({ item }) => {
  const getStatusColor = (status) => {
    const key = status?.toLowerCase().replace(/\s+/g, '')
    switch (key) {
      case 'done':
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'inprogress':
      case 'in-progress':
        return 'text-blue-600 bg-blue-50'
      case 'cancelled':
      case 'canceled':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="flex items-start space-x-4 py-4 border-l-2 border-gray-200 ml-3 pl-6 relative">
      {/* Timeline dot */}
      <div className="absolute -left-[9px] top-5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
      
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(item.old_status)}`}>
            {item.old_status || 'N/A'}
          </span>
          <span className="text-gray-400">→</span>
          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(item.new_status)}`}>
            {item.new_status}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-500 space-x-4">
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatDate(item.created_at)}
          </span>
          {item.changed_by && (
            <span className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              {item.changed_by}
            </span>
          )}
        </div>
        {item.remarks && (
          <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
            {item.remarks}
          </p>
        )}
      </div>
    </div>
  )
}

const ProjectDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { 
    currentProject, 
    fetchProject, 
    deleteProject, 
    updateProject,
    loading, 
    error 
  } = useProjectStore()
  
  const [statusHistory, setStatusHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Fetch project data
  useEffect(() => {
    const loadProject = async () => {
      try {
        await fetchProject(id)
      } catch (err) {
        console.error('Failed to load project:', err)
      }
    }
    loadProject()
  }, [id, fetchProject])

  // Fetch status history
  useEffect(() => {
    const loadHistory = async () => {
      if (!id) return
      setHistoryLoading(true)
      try {
        const response = await api.getProjectHistory?.(id) || { data: [] }
        setStatusHistory(response.data || [])
      } catch (err) {
        console.error('Failed to load status history:', err)
        setStatusHistory([])
      } finally {
        setHistoryLoading(false)
      }
    }
    loadHistory()
  }, [id])

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    
    try {
      await deleteProject(id)
      navigate('/projects')
    } catch (err) {
      console.error('Failed to delete project:', err)
      alert('Failed to delete project. Please try again.')
    }
  }

  const handleUpdate = async (formData) => {
    try {
      await updateProject(id, formData)
      setShowEditForm(false)
      await fetchProject(id)
    } catch (err) {
      console.error('Failed to update project:', err)
      throw err
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading project details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !currentProject) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-600 mb-4">
            {error || "The project you're looking for doesn't exist or has been removed."}
          </p>
          <Link
            to="/projects"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  const project = currentProject
  const projectTypeColor = getProjectTypeColor(project.project_type)

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.site_name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex items-center text-gray-500">
              <Tag className="w-4 h-4 mr-1" />
              <span className="font-mono text-sm">{project.site_code}</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditForm(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                deleteConfirm 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'border border-red-300 text-red-600 bg-white hover:bg-red-50'
              }`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteConfirm ? 'Confirm Delete' : 'Delete'}
            </button>
            {deleteConfirm && (
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Project Information */}
        <div className="space-y-6">
          {/* Project Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Project Information
              </h2>
            </div>
            <div className="p-6">
              <InfoRow 
                icon={Tag} 
                label="Site Code" 
                value={project.site_code} 
                copyable 
              />
              <InfoRow 
                icon={Activity} 
                label="Project Type" 
                value={project.project_type}
              />
              {project.project_type && (
                <div className="flex items-center space-x-3 py-3 border-b border-gray-100">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: projectTypeColor }}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type Color</p>
                    <p className="text-sm font-medium text-gray-900">{projectTypeColor}</p>
                  </div>
                </div>
              )}
              <InfoRow 
                icon={Building2} 
                label="Site Name" 
                value={project.site_name} 
              />
              <InfoRow 
                icon={Activity} 
                label="Status" 
                value={project.status} 
              />
              <InfoRow 
                icon={Calendar} 
                label="Activation Date" 
                value={formatDate(project.activation_date)} 
              />
              {project.remarks && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">Remarks/Description</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {project.remarks}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Location Information */}
        <div className="space-y-6">
          {/* Location Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-green-600" />
                Location Information
              </h2>
            </div>
            
            {/* Map */}
            {project.latitude && project.longitude && (
              <div className="h-64 border-b border-gray-100">
                <MapContainer
                  center={[project.latitude, project.longitude]}
                  zoom={15}
                  className="w-full h-full"
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[project.latitude, project.longitude]}>
                    <Popup>
                      <div className="text-center">
                        <p className="font-semibold">{project.site_name}</p>
                        <p className="text-sm text-gray-600">{project.site_code}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}
            
            <div className="p-6">
              {project.latitude && project.longitude && (
                <>
                  <InfoRow 
                    icon={MapPin} 
                    label="Latitude" 
                    value={project.latitude.toString()} 
                    copyable 
                  />
                  <InfoRow 
                    icon={MapPin} 
                    label="Longitude" 
                    value={project.longitude.toString()} 
                    copyable 
                  />
                </>
              )}
              <InfoRow 
                icon={Building2} 
                label="Province" 
                value={project.province} 
              />
              <InfoRow 
                icon={Building2} 
                label="Municipality" 
                value={project.municipality} 
              />
              <InfoRow 
                icon={Building2} 
                label="Barangay" 
                value={project.barangay} 
              />
              <InfoRow 
                icon={Tag} 
                label="District" 
                value={project.district} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status History Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-purple-600" />
            Status History
          </h2>
        </div>
        <div className="p-6">
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
              <span className="text-gray-600">Loading history...</span>
            </div>
          ) : statusHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No status history available</p>
            </div>
          ) : (
            <div className="space-y-0">
              {statusHistory.map((item, index) => (
                <HistoryItem key={index} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <ProjectForm
          project={project}
          onClose={() => setShowEditForm(false)}
          onSave={handleUpdate}
        />
      )}
    </div>
  )
}

export default ProjectDetail