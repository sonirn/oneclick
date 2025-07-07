'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { 
  Play, 
  Pause, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Activity,
  Zap,
  Video
} from 'lucide-react'

interface Job {
  id: string
  job_type: string
  status: string
  progress: number
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

interface ProgressTrackerProps {
  projectId: string
  project: any
  onUpdate: () => void
}

export default function ProgressTracker({ projectId, project, onUpdate }: ProgressTrackerProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchJobs()
    // Poll for job updates every 5 seconds
    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [projectId])

  const fetchJobs = async () => {
    try {
      const response = await fetch(`/api/jobs?projectId=${projectId}`)
      const data = await response.json()
      
      if (data.success) {
        setJobs(data.jobs)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const startVideoGeneration = async () => {
    if (!project.generation_plan) {
      toast.error('Please create a generation plan first')
      return
    }

    setGenerating(true)
    try {
      // This would be the actual video generation API call
      // For now, we'll create a mock job
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId,
          plan: project.generation_plan
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Video generation started!')
        fetchJobs()
        onUpdate()
      } else {
        toast.error(`Failed to start generation: ${data.error}`)
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Failed to start video generation')
    } finally {
      setGenerating(false)
    }
  }

  const getJobIcon = (jobType: string, status: string) => {
    if (status === 'processing') {
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
    }
    
    switch (jobType) {
      case 'video_analysis':
        return <Activity className="w-5 h-5 text-purple-500" />
      case 'plan_generation':
        return <Zap className="w-5 h-5 text-orange-500" />
      case 'video_generation':
        return <Video className="w-5 h-5 text-green-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getJobTitle = (jobType: string) => {
    switch (jobType) {
      case 'video_analysis':
        return 'Video Analysis'
      case 'plan_generation':
        return 'Plan Generation'
      case 'video_generation':
        return 'Video Generation'
      default:
        return jobType.replace('_', ' ')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return '-'
    
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.round((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) return `${duration}s`
    return `${Math.round(duration / 60)}m ${duration % 60}s`
  }

  const canStartGeneration = project.generation_plan && 
    !jobs.some(job => job.job_type === 'video_generation' && job.status === 'processing')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Generation Control */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Video Generation</h3>
            <p className="text-gray-600 mt-1">
              {project.generation_plan 
                ? 'Ready to generate your video using the AI plan'
                : 'Complete analysis and planning first'
              }
            </p>
          </div>
          <button
            onClick={startVideoGeneration}
            disabled={!canStartGeneration || generating}
            className="inline-flex items-center px-6 py-3 text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Generation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Processing History</h3>
        </div>
        
        {jobs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No processing jobs yet</p>
            <p className="text-sm mt-1">Jobs will appear here when you start analysis or generation</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <div key={job.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getJobIcon(job.job_type, job.status)}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getJobTitle(job.job_type)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Started: {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(job.status)}
                        <span className="text-sm font-medium capitalize">
                          {job.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Duration: {formatDuration(job.started_at, job.completed_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {job.status === 'processing' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-medium">{job.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {job.error_message && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-red-800">Error</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">{job.error_message}</p>
                  </div>
                )}

                {/* Success Message */}
                {job.status === 'completed' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-800">
                        Completed successfully
                      </span>
                    </div>
                    {job.completed_at && (
                      <p className="text-sm text-green-700 mt-1">
                        Finished: {new Date(job.completed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processing Stats */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobs.filter(job => job.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobs.filter(job => job.status === 'processing').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobs.filter(job => job.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}