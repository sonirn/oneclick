'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import { Video, Calendar, Clock, Download, Eye, Trash2, Loader2, Brain, MessageSquare } from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import ProjectDetailView from './ProjectDetailView'

interface Project {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  updated_at: string
  sample_video_url?: string
  character_image_url?: string
  audio_file_url?: string
  analysis_result?: any
  generation_plan?: any
  generated_videos?: GeneratedVideo[]
}

interface GeneratedVideo {
  id: string
  video_url: string
  thumbnail_url?: string
  duration: number
  file_size: number
  quality: string
  status: string
  ai_model_used: string
  created_at: string
  expires_at: string
}

interface ProjectListProps {
  user: User
}

export default function ProjectList({ user }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [user.id])

  const fetchProjects = async () => {
    try {
      const response = await fetch(`/api/projects?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }
      
      const data = await response.json()
      if (data.success) {
        setProjects(data.projects)
      } else {
        throw new Error(data.error || 'Failed to fetch projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      const data = await response.json()
      if (data.success) {
        setProjects(prev => prev.filter(p => p.id !== projectId))
        toast.success('Project deleted successfully')
      } else {
        throw new Error(data.error || 'Failed to delete project')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'analyzing':
      case 'planning':
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'analyzed':
      case 'plan_ready':
        return 'bg-purple-100 text-purple-800'
      case 'failed':
      case 'analysis_failed':
      case 'plan_failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'analyzed':
        return <Brain className="w-4 h-4 text-purple-600" />
      case 'plan_ready':
        return <MessageSquare className="w-4 h-4 text-green-600" />
      case 'analyzing':
      case 'planning':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
        <p className="text-gray-600 mb-6">
          Create your first AI video project to get started
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
        >
          Create Project
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
        <button
          onClick={fetchProjects}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="aspect-w-16 aspect-h-9 bg-gray-200">
              {project.sample_video_url ? (
                <video
                  src={project.sample_video_url}
                  className="w-full h-48 object-cover"
                  muted
                />
              ) : (
                <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                  <Video className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {project.title}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>

              {project.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center text-sm text-gray-500 mb-4">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(project.created_at)}
              </div>

              {project.generated_videos && project.generated_videos.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Generated Videos ({project.generated_videos.length})
                  </p>
                  <div className="space-y-2">
                    {project.generated_videos.slice(0, 2).map((video) => (
                      <div key={video.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            video.status === 'completed' ? 'bg-green-500' : 
                            video.status === 'processing' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm text-gray-700">{video.ai_model_used}</span>
                        </div>
                        {video.status === 'completed' && (
                          <button className="text-purple-600 hover:text-purple-700">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedProject(project)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </button>
                <button
                  onClick={() => deleteProject(project.id)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedProject.title}</h2>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Project Details</h3>
                  <p className="text-gray-600">{selectedProject.description}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    Created: {formatDate(selectedProject.created_at)}
                  </div>
                </div>

                {selectedProject.sample_video_url && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Sample Video</h3>
                    <video
                      src={selectedProject.sample_video_url}
                      className="w-full max-w-md rounded-lg"
                      controls
                    />
                  </div>
                )}

                {selectedProject.character_image_url && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Character Image</h3>
                    <img
                      src={selectedProject.character_image_url}
                      alt="Character"
                      className="w-full max-w-md rounded-lg"
                    />
                  </div>
                )}

                {selectedProject.generated_videos && selectedProject.generated_videos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Generated Videos</h3>
                    <div className="space-y-4">
                      {selectedProject.generated_videos.map((video) => (
                        <div key={video.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">AI Model: {video.ai_model_used}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(video.status)}`}>
                              {video.status}
                            </span>
                          </div>
                          
                          {video.status === 'completed' && video.video_url && (
                            <div className="space-y-2">
                              <video
                                src={video.video_url}
                                className="w-full max-w-md rounded"
                                controls
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">
                                  Duration: {formatDuration(video.duration)} | Quality: {video.quality}
                                </span>
                                <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700">
                                  <Download className="w-4 h-4 mr-1" />
                                  Download
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}