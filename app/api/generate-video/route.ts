import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { videoGenerationService, VideoGenerationPlan } from '@/lib/video-generation-service'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { projectId, plan } = await request.json()

    if (!projectId || !plan) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID and plan are required' 
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

    if (!project.generation_plan) {
      return NextResponse.json({ 
        success: false, 
        error: 'No generation plan found. Please create a plan first.' 
      }, { status: 400 })
    }

    // Update project status to generating
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['generating', projectId]
    )

    // Use the new video generation service
    const generationPlan: VideoGenerationPlan = project.generation_plan;
    const result = await videoGenerationService.generateVideo(projectId, generationPlan);

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Video generation failed' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      job_id: result.jobId,
      video_ids: result.videoIds,
      message: 'Video generation started with real AI models',
      estimated_time: result.estimatedTime,
      ai_models_used: generationPlan.segments.map(s => s.ai_model)
    })
  } catch (error) {
    console.error('Error starting video generation:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start video generation' 
    }, { status: 500 })
  }
}

// Remove the old simulation function since we're using real AI services now