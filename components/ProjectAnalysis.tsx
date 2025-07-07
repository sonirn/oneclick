'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { 
  Brain, 
  Play, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react'

interface Project {
  id: string
  title: string
  description: string
  status: string
  analysis_result?: any
  generation_plan?: any
  sample_video_url?: string
  character_image_url?: string
  audio_file_url?: string
}

interface ProjectAnalysisProps {
  project: Project
  onUpdate: () => void
}

export default function ProjectAnalysis({ project, onUpdate }: ProjectAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false)
  const [showPlanDetails, setShowPlanDetails] = useState(false)

  const startAnalysis = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Video analysis completed successfully!')
        onUpdate()
      } else {
        toast.error(`Analysis failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Analysis error:', error)
      toast.error('Failed to start analysis')
    } finally {
      setAnalyzing(false)
    }
  }

  const generatePlan = async () => {
    setGeneratingPlan(true)
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project.id,
          userRequirements: 'Create a similar video with high quality and engaging content'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Generation plan created successfully!')
        onUpdate()
      } else {
        toast.error(`Plan generation failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Plan generation error:', error)
      toast.error('Failed to generate plan')
    } finally {
      setGeneratingPlan(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'created':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'analyzing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      case 'analyzed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'planning':
        return <RefreshCw className="w-5 h-5 text-purple-500 animate-spin" />
      case 'plan_ready':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'analysis_failed':
      case 'plan_failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'created':
        return 'Ready for analysis'
      case 'analyzing':
        return 'Analyzing video content...'
      case 'analyzed':
        return 'Analysis complete'
      case 'planning':
        return 'Generating plan...'
      case 'plan_ready':
        return 'Plan ready for review'
      case 'analysis_failed':
        return 'Analysis failed'
      case 'plan_failed':
        return 'Plan generation failed'
      default:
        return status
    }
  }

  const canAnalyze = project.status === 'created' || project.status === 'analysis_failed'
  const canGeneratePlan = project.status === 'analyzed' || project.status === 'plan_failed'
  const hasAnalysis = project.analysis_result && project.status !== 'analysis_failed'
  const hasPlan = project.generation_plan && project.status !== 'plan_failed'

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">AI Analysis & Planning</h2>
        <div className="flex items-center space-x-2">
          {getStatusIcon(project.status)}
          <span className="text-sm font-medium text-gray-700">
            {getStatusText(project.status)}
          </span>
        </div>
      </div>

      {/* Analysis Section */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-medium text-gray-900">Video Analysis</h3>
              <p className="text-sm text-gray-600">
                AI analyzes your video content, style, and structure
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasAnalysis && (
              <button
                onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200"
              >
                <Eye className="w-4 h-4 mr-1" />
                View Details
              </button>
            )}
            <button
              onClick={startAnalysis}
              disabled={!canAnalyze || analyzing}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {hasAnalysis ? 'Re-analyze' : 'Start Analysis'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Analysis Details */}
        {showAnalysisDetails && hasAnalysis && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Analysis Results</h4>
            <div className="space-y-2 text-sm">
              {project.analysis_result.visual_style && (
                <div>
                  <span className="font-medium text-blue-800">Visual Style:</span>
                  <span className="text-blue-700 ml-2">
                    {project.analysis_result.visual_style.colors}, {project.analysis_result.visual_style.lighting}
                  </span>
                </div>
              )}
              {project.analysis_result.content_analysis && (
                <div>
                  <span className="font-medium text-blue-800">Content Type:</span>
                  <span className="text-blue-700 ml-2">
                    {project.analysis_result.content_analysis.type} - {project.analysis_result.content_analysis.mood}
                  </span>
                </div>
              )}
              {project.analysis_result.technical_details && (
                <div>
                  <span className="font-medium text-blue-800">Technical:</span>
                  <span className="text-blue-700 ml-2">
                    {project.analysis_result.technical_details.pacing} pacing, 
                    {project.analysis_result.technical_details.complexity} complexity
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Plan Generation Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="font-medium text-gray-900">Generation Plan</h3>
              <p className="text-sm text-gray-600">
                Create a detailed plan for video generation
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasPlan && (
              <button
                onClick={() => setShowPlanDetails(!showPlanDetails)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200"
              >
                <Eye className="w-4 h-4 mr-1" />
                View Plan
              </button>
            )}
            <button
              onClick={generatePlan}
              disabled={!canGeneratePlan || generatingPlan}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingPlan ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  {hasPlan ? 'Regenerate Plan' : 'Generate Plan'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Plan Details */}
        {showPlanDetails && hasPlan && (
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-3">Generation Plan</h4>
            <div className="space-y-3 text-sm">
              {project.generation_plan.plan_summary && (
                <div>
                  <span className="font-medium text-purple-800">Summary:</span>
                  <p className="text-purple-700 mt-1">{project.generation_plan.plan_summary}</p>
                </div>
              )}
              
              {project.generation_plan.segments && (
                <div>
                  <span className="font-medium text-purple-800">Segments ({project.generation_plan.segments.length}):</span>
                  <div className="mt-2 space-y-2">
                    {project.generation_plan.segments.slice(0, 3).map((segment: any, index: number) => (
                      <div key={index} className="p-2 bg-white rounded border">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-purple-900">Segment {segment.segment_number}</span>
                          <span className="text-xs text-purple-600">{segment.ai_model}</span>
                        </div>
                        <p className="text-purple-700 text-xs mt-1">{segment.description}</p>
                      </div>
                    ))}
                    {project.generation_plan.segments.length > 3 && (
                      <p className="text-purple-600 text-xs">
                        +{project.generation_plan.segments.length - 3} more segments...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {project.generation_plan.estimated_time && (
                <div>
                  <span className="font-medium text-purple-800">Estimated Time:</span>
                  <span className="text-purple-700 ml-2">{project.generation_plan.estimated_time}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Next Steps */}
      {hasPlan && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">Ready for Chat & Generation</span>
          </div>
          <p className="text-green-700 text-sm">
            Your plan is ready! You can now chat with AI to modify the plan or proceed to video generation.
          </p>
        </div>
      )}
    </div>
  )
}