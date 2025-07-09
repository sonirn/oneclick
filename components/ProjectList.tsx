'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import { 
  Video, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Eye,
  RefreshCw,
  Calendar,
  MoreHorizontal,
  Settings,
  Trash2,
  Share2,
  Star,
  StarOff
} from 'lucide-react'
import ProjectDetailView from './ProjectDetailView'

interface Project {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  updated_at: string
  user_id: string
  sample_video_url?: string
  character_image_url?: string
  audio_file_url?: string
  analysis_result?: any
  generation_plan?: any
  is_favorite?: boolean
  generated_video_count?: number
}

interface ProjectListProps {
  user: User
}

export default function ProjectList({ user }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date')

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [projects, searchQuery, filterStatus, sortBy])

  const fetchProjects = async () => {
    try {
      const response = await fetch(`/api/projects?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        setProjects(data.projects)
      } else {
        toast.error('Failed to load projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...projects]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus)
    }

    // Apply sorting
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'status':
        filtered.sort((a, b) => a.status.localeCompare(b.status))
        break
    }

    setFilteredProjects(filtered)
  }

  const toggleFavorite = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setProjects(prev => prev.map(project => 
          project.id === projectId 
            ? { ...project, is_favorite: !project.is_favorite }
            : project
        ))
        toast.success('Updated favorites')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite')
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setProjects(prev => prev.filter(project => project.id !== projectId))
        toast.success('Project deleted successfully')
      } else {
        toast.error('Failed to delete project')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'generating':
      case 'analyzing':
      case 'planning':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed':
      case 'analysis_failed':
      case 'plan_failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'analyzed':
      case 'plan_ready':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'generating':
      case 'analyzing':
      case 'planning':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
      case 'analysis_failed':
      case 'plan_failed':
        return 'bg-red-100 text-red-800'
      case 'analyzed':
      case 'plan_ready':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'created':
        return 'Created'
      case 'analyzing':
        return 'Analyzing'
      case 'analyzed':
        return 'Analyzed'
      case 'planning':
        return 'Planning'
      case 'plan_ready':
        return 'Plan Ready'
      case 'generating':
        return 'Generating'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      case 'analysis_failed':
        return 'Analysis Failed'
      case 'plan_failed':
        return 'Plan Failed'
      default:
        return status
    }
  }

  const getNextAction = (project: Project) => {
    switch (project.status) {
      case 'created':
        return 'Start Analysis'
      case 'analyzed':
        return 'Generate Plan'
      case 'plan_ready':
        return 'Start Generation'
      case 'completed':
        return 'View Results'
      case 'failed':
      case 'analysis_failed':
      case 'plan_failed':
        return 'Retry'
      default:
        return 'View Details'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const uniqueStatuses = [...new Set(projects.map(p => p.status))]

  if (selectedProject) {
    return (
      <ProjectDetailView 
        projectId={selectedProject}
        onBack={() => setSelectedProject(null)}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
            <p className="text-gray-600">Manage your video generation projects</p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredProjects.length} of {projects.length} projects
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <Video className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-purple-600">Total Projects</p>
                <p className="text-2xl font-bold text-purple-900">{projects.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-green-600">Completed</p>
                <p className="text-2xl font-bold text-green-900">
                  {projects.filter(p => p.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <RefreshCw className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-blue-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-900">
                  {projects.filter(p => ['analyzing', 'planning', 'generating'].includes(p.status)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm text-red-600">Failed</p>
                <p className="text-2xl font-bold text-red-900">
                  {projects.filter(p => p.status.includes('failed')).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {getStatusText(status)}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white rounded-lg shadow-sm">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first project to get started'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredProjects.map((project) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <button
                        onClick={() => toggleFavorite(project.id)}
                        className="text-gray-400 hover:text-yellow-500"
                      >
                        {project.is_favorite ? (
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                        ) : (
                          <StarOff className="w-5 h-5" />
                        )}
                      </button>
                      <h3 className="text-lg font-medium text-gray-900 hover:text-purple-600 cursor-pointer"
                          onClick={() => setSelectedProject(project.id)}>
                        {project.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                        {getStatusText(project.status)}
                      </span>
                    </div>
                    
                    {project.description && (
                      <p className="text-gray-600 mb-3">{project.description}</p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500 space-x-6">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Created: {formatDate(project.created_at)}
                      </div>
                      <div className="flex items-center">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Updated: {formatDate(project.updated_at)}
                      </div>
                      {project.generated_video_count && (
                        <div className="flex items-center">
                          <Video className="w-4 h-4 mr-1" />
                          {project.generated_video_count} videos
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {getStatusIcon(project.status)}
                    <button
                      onClick={() => setSelectedProject(project.id)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {getNextAction(project)}
                    </button>
                    
                    <div className="relative">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {/* Dropdown menu would go here */}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}