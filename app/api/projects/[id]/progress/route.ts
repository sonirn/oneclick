import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    if (!projectId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    // Get project details
    const projectQuery = 'SELECT * FROM projects WHERE id = $1'
    const projectResult = await db.query(projectQuery, [projectId])
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 })
    }

    const project = projectResult.rows[0]

    // Get current processing jobs
    const jobsQuery = `
      SELECT id, job_type, status, progress, error_message, started_at, completed_at
      FROM processing_jobs 
      WHERE project_id = $1 
      ORDER BY created_at DESC
    `
    const jobsResult = await db.query(jobsQuery, [projectId])

    // Get generated videos status
    const videosQuery = `
      SELECT id, status, ai_model_used, duration, video_url, error_message, 
             generation_params, created_at, updated_at
      FROM generated_videos 
      WHERE project_id = $1 
      ORDER BY created_at ASC
    `
    const videosResult = await db.query(videosQuery, [projectId])

    // Calculate overall progress
    const videos = videosResult.rows
    const totalVideos = videos.length
    const completedVideos = videos.filter(v => v.status === 'completed').length
    const failedVideos = videos.filter(v => v.status === 'failed').length
    const processingVideos = videos.filter(v => v.status === 'processing').length

    const overallProgress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0

    // Get detailed segment progress
    const segmentProgress = videos.map(video => ({
      id: video.id,
      status: video.status,
      ai_model: video.ai_model_used,
      duration: video.duration,
      video_url: video.video_url,
      error: video.error_message,
      segment_info: video.generation_params ? JSON.parse(video.generation_params) : {},
      created_at: video.created_at,
      updated_at: video.updated_at
    }))

    // Determine current phase
    let currentPhase = 'idle'
    if (project.status === 'analyzing') {
      currentPhase = 'analysis'
    } else if (project.status === 'planning') {
      currentPhase = 'planning'
    } else if (project.status === 'generating') {
      currentPhase = 'generation'
    } else if (project.status === 'composing') {
      currentPhase = 'composition'
    } else if (project.status === 'completed') {
      currentPhase = 'completed'
    } else if (project.status === 'failed') {
      currentPhase = 'failed'
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at
      },
      progress: {
        overall_progress: overallProgress,
        current_phase: currentPhase,
        total_segments: totalVideos,
        completed_segments: completedVideos,
        failed_segments: failedVideos,
        processing_segments: processingVideos
      },
      jobs: jobsResult.rows.map(job => ({
        id: job.id,
        type: job.job_type,
        status: job.status,
        progress: job.progress,
        error: job.error_message,
        started_at: job.started_at,
        completed_at: job.completed_at
      })),
      segments: segmentProgress,
      estimated_completion: this.calculateEstimatedCompletion(videos),
      next_steps: this.getNextSteps(project.status, videos)
    })
  } catch (error) {
    console.error('Error getting project progress:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get project progress' 
    }, { status: 500 })
  }
}

function calculateEstimatedCompletion(videos: any[]): string {
  const processingVideos = videos.filter(v => v.status === 'processing')
  
  if (processingVideos.length === 0) {
    return 'N/A'
  }
  
  // Rough estimation: 2 minutes per segment
  const estimatedMinutes = processingVideos.length * 2
  const completionTime = new Date(Date.now() + estimatedMinutes * 60 * 1000)
  
  return completionTime.toISOString()
}

function getNextSteps(projectStatus: string, videos: any[]): string[] {
  const steps: string[] = []
  
  switch (projectStatus) {
    case 'analyzing':
      steps.push('Analyzing video content and style')
      steps.push('Extracting key visual elements')
      break
    case 'planning':
      steps.push('Generating detailed video plan')
      steps.push('Selecting optimal AI models')
      break
    case 'generating':
      const processingCount = videos.filter(v => v.status === 'processing').length
      const pendingCount = videos.filter(v => v.status === 'pending').length
      
      if (processingCount > 0) {
        steps.push(`Processing ${processingCount} video segments`)
      }
      if (pendingCount > 0) {
        steps.push(`${pendingCount} segments waiting in queue`)
      }
      break
    case 'composing':
      steps.push('Stitching video segments together')
      steps.push('Adding audio and effects')
      steps.push('Final quality check')
      break
    case 'completed':
      steps.push('Video generation completed!')
      steps.push('Ready for download')
      break
    case 'failed':
      steps.push('Review error messages')
      steps.push('Retry failed segments')
      break
    default:
      steps.push('Ready to start generation')
  }
  
  return steps
}