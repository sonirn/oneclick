'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { 
  ArrowLeft, 
  Video, 
  Image, 
  Music, 
  Calendar,
  RefreshCw,
  Play,
  Download,
  Share2
} from 'lucide-react'
import ProjectAnalysis from './ProjectAnalysis'
import ChatInterface from './ChatInterface'
import ProgressTracker from './ProgressTracker'

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
  generated_videos?: any[]
}

interface ProjectDetailViewProps {
  projectId: string
  onBack: () => void
}

export default function ProjectDetailView({ projectId, onBack }: ProjectDetailViewProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('analysis')

  useEffect(() => {
    fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      const data = await response.json()
      
      if (data.success) {
        setProject(data.project)
      } else {
        toast.error('Failed to load project')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      toast.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleProjectUpdate = () => {
    fetchProject()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created':
        return 'bg-yellow-100 text-yellow-800'
      case 'analyzing':
      case 'planning':
        return 'bg-blue-100 text-blue-800'
      case 'analyzed':
      case 'plan_ready':
        return 'bg-green-100 text-green-800'
      case 'generating':
        return 'bg-purple-100 text-purple-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
      case 'analysis_failed':
      case 'plan_failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Project not found</p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'analysis', name: 'Analysis & Planning', icon: Video },
    { id: 'chat', name: 'AI Chat', icon: Play, disabled: !project.generation_plan },
    { id: 'progress', name: 'Generation Progress', icon: RefreshCw },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </button>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
            {project.status.replace('_', ' ')}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            {project.description && (
              <p className="text-gray-600 mt-2">{project.description}</p>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-500 space-x-6">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Created: {formatDate(project.created_at)}
            </div>
            <div className="flex items-center">
              <RefreshCw className="w-4 h-4 mr-1" />
              Updated: {formatDate(project.updated_at)}
            </div>
          </div>

          {/* Media Files */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {project.sample_video_url && (
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-700">
                  <Video className="w-4 h-4 mr-2" />
                  Sample Video
                </div>
                <video
                  src={project.sample_video_url}
                  className="w-full h-32 object-cover rounded border"
                  controls
                />
              </div>
            )}

            {project.character_image_url && (
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-700">
                  <Image className="w-4 h-4 mr-2" />
                  Character Image
                </div>
                <img
                  src={project.character_image_url}
                  alt="Character"
                  className="w-full h-32 object-cover rounded border"
                />
              </div>
            )}

            {project.audio_file_url && (
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-700">
                  <Music className="w-4 h-4 mr-2" />
                  Audio File
                </div>
                <div className="p-4 border rounded h-32 flex items-center justify-center bg-gray-50">
                  <audio src={project.audio_file_url} controls className="w-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : tab.disabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={tab.disabled}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.name}
                  {tab.disabled && (
                    <span className="ml-2 text-xs text-gray-400">(Plan needed)</span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'analysis' && (
            <ProjectAnalysis 
              project={project} 
              onUpdate={handleProjectUpdate}
            />
          )}
          
          {activeTab === 'chat' && (
            <ChatInterface 
              projectId={project.id}
              project={project}
              onPlanUpdate={handleProjectUpdate}
            />
          )}
          
          {activeTab === 'progress' && (
            <ProgressTracker 
              projectId={project.id}
              project={project}
              onUpdate={handleProjectUpdate}
            />
          )}
        </div>
      </div>

      {/* Generated Videos */}
      {project.generated_videos && project.generated_videos.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Videos</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {project.generated_videos.map((video) => (
              <div key={video.id} className="border rounded-lg p-4">
                <div className="aspect-w-9 aspect-h-16 mb-3">
                  {video.video_url ? (
                    <video
                      src={video.video_url}
                      className="w-full h-48 object-cover rounded"
                      controls
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{video.ai_model_used}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(video.status)}`}>
                      {video.status}
                    </span>
                  </div>
                  
                  {video.status === 'completed' && video.video_url && (
                    <div className="flex space-x-2">
                      <button className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </button>
                      <button className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}