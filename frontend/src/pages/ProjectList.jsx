import { useState, useEffect } from 'react'
import { Plus, Upload } from 'lucide-react'
import ProjectTable from '@/components/projects/ProjectTable'
import ProjectFilters from '@/components/projects/ProjectFilters'
import ProjectForm from '@/components/projects/ProjectForm'
import ImportModal from '@/components/import/ImportModal'
import { useProjectStore } from '@/stores/projectStore'

const ProjectList = () => {
  const { 
    fetchProjects, 
    createProject, 
    updateProject, 
    deleteProject,
    filters 
  } = useProjectStore()
  
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects, filters])

  const handleAddProject = () => {
    setEditingProject(null)
    setShowForm(true)
  }

  const handleEditProject = (project) => {
    setEditingProject(project)
    setShowForm(true)
  }

  const handleDeleteProject = async (project) => {
    if (window.confirm(`Are you sure you want to delete project "${project.site_code}"?`)) {
      try {
        await deleteProject(project.id)
        fetchProjects()
      } catch (error) {
        console.error('Failed to delete project:', error)
        alert('Failed to delete project. Please try again.')
      }
    }
  }

  const handleSaveProject = async (formData) => {
    if (editingProject) {
      await updateProject(editingProject.id, formData)
    } else {
      await createProject(formData)
    }
    fetchProjects()
  }

  const handleImportComplete = (result) => {
    if (result.success || result.successCount > 0) {
      fetchProjects()
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">
            Manage and track all your projects
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </button>
          <button
            onClick={handleAddProject}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <div className="lg:w-72 flex-shrink-0">
          <ProjectFilters />
        </div>

        {/* Project Table */}
        <div className="flex-1 min-w-0">
          <ProjectTable 
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
          />
        </div>
      </div>

      {/* Project Form Modal */}
      {showForm && (
        <ProjectForm
          project={editingProject}
          onClose={() => setShowForm(false)}
          onSave={handleSaveProject}
        />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}

export default ProjectList
