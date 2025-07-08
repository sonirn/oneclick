import { NextRequest, NextResponse } from 'next/server'
import { videoGenerationService } from '@/lib/video-generation-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    if (!jobId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Job ID is required' 
      }, { status: 400 })
    }

    const progress = await videoGenerationService.getJobProgress(jobId)

    if (!progress.success) {
      return NextResponse.json({ 
        success: false, 
        error: progress.error 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      job_id: jobId,
      status: progress.job_status,
      progress: progress.progress,
      error: progress.error,
      video_progress: progress.video_progress,
      details: {
        processing: progress.video_progress?.processing || 0,
        completed: progress.video_progress?.completed || 0,
        failed: progress.video_progress?.failed || 0,
        total: (progress.video_progress?.processing || 0) + 
               (progress.video_progress?.completed || 0) + 
               (progress.video_progress?.failed || 0)
      }
    })
  } catch (error) {
    console.error('Error getting job progress:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get job progress' 
    }, { status: 500 })
  }
}