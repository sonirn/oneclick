import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { videoGenerationService } from '@/lib/video-generation-service'

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

    // Create comprehensive video generation request
    const generationRequest = {
      projectId: projectId,
      plan: project.generation_plan,
      sampleVideoUrl: project.sample_video_url,
      characterImageUrl: project.character_image_url,
      audioFileUrl: project.audio_file_url,
      userRequirements: project.description
    };

    // Use the new comprehensive video generation service
    const result = await videoGenerationService.generateVideo(projectId, generationRequest);

    if (!result.success) {
      // Update project status to failed
      await db.query(
        'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
        ['failed', projectId]
      )
      
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Video generation failed' 
      }, { status: 500 })
    }

    // Create processing job record
    await db.query(
      `INSERT INTO processing_jobs (id, project_id, job_type, status, progress, job_data, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [result.jobId, projectId, 'video_generation', 'processing', 0, JSON.stringify(generationRequest)]
    )

    return NextResponse.json({ 
      success: true, 
      job_id: result.jobId,
      status: result.status,
      progress: result.progress,
      estimated_time: result.estimatedTime,
      message: 'Video generation started with real AI models (RunwayML, Google Veo, ElevenLabs)',
      ai_models_available: ['RunwayML Gen-4 Turbo', 'RunwayML Gen-3 Alpha', 'Google Veo 3', 'Google Veo 2'],
      features: [
        'Real AI video generation',
        'Automatic segment creation',
        'Multi-model AI selection',
        'Audio generation with ElevenLabs',
        'FFmpeg video composition',
        'Background processing',
        'Progress tracking',
        '9:16 aspect ratio',
        'High quality output'
      ]
    })
  } catch (error) {
    console.error('Error starting video generation:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start video generation' 
    }, { status: 500 })
  }
}