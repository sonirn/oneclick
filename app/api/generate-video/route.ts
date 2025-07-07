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

    // Create processing job for video generation
    const jobQuery = `
      INSERT INTO processing_jobs (project_id, job_type, status, job_data, started_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `
    
    const jobResult = await db.query(jobQuery, [
      projectId,
      'video_generation',
      'processing',
      JSON.stringify({
        plan: project.generation_plan,
        segments: plan.segments || [],
        total_duration: plan.total_duration || 60
      })
    ])

    const jobId = jobResult.rows[0].id

    // Create generated video records for each segment/model
    const segments = plan.segments || []
    const videoIds: string[] = []

    for (const segment of segments) {
      const videoId = uuidv4()
      videoIds.push(videoId)

      await db.query(
        `INSERT INTO generated_videos 
         (id, project_id, aspect_ratio, status, ai_model_used, generation_params, duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          videoId,
          projectId,
          '9:16',
          'processing',
          segment.ai_model || 'runway-gen4',
          JSON.stringify({
            segment_number: segment.segment_number,
            description: segment.description,
            prompt: segment.prompt
          }),
          parseInt(segment.duration) || 15
        ]
      )
    }

    // Simulate background processing (in production, this would be handled by a job queue)
    processVideoGenerationInBackground(jobId, projectId, videoIds)

    return NextResponse.json({ 
      success: true, 
      job_id: jobId,
      video_ids: videoIds,
      message: 'Video generation started successfully',
      estimated_time: plan.estimated_time || '10-15 minutes'
    })
  } catch (error) {
    console.error('Error starting video generation:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start video generation' 
    }, { status: 500 })
  }
}

// Simulate background video generation processing
async function processVideoGenerationInBackground(jobId: string, projectId: string, videoIds: string[]) {
  try {
    console.log(`Starting background video generation for job ${jobId}`)
    
    // Simulate progressive updates
    const totalSteps = 10
    for (let step = 1; step <= totalSteps; step++) {
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
      
      const progress = Math.round((step / totalSteps) * 100)
      
      // Update job progress
      await db.query(
        'UPDATE processing_jobs SET progress = $1, updated_at = NOW() WHERE id = $2',
        [progress, jobId]
      )
      
      console.log(`Video generation progress: ${progress}%`)
      
      // Simulate individual video completion at different stages
      if (step === 4 && videoIds[0]) {
        await db.query(
          `UPDATE generated_videos 
           SET status = $1, video_url = $2, file_size = $3, quality = $4, updated_at = NOW()
           WHERE id = $5`,
          [
            'completed',
            `https://example.com/generated-videos/${videoIds[0]}.mp4`,
            25000000, // 25MB
            'HD',
            videoIds[0]
          ]
        )
      }
      
      if (step === 7 && videoIds[1]) {
        await db.query(
          `UPDATE generated_videos 
           SET status = $1, video_url = $2, file_size = $3, quality = $4, updated_at = NOW()
           WHERE id = $5`,
          [
            'completed',
            `https://example.com/generated-videos/${videoIds[1]}.mp4`,
            30000000, // 30MB
            'HD',
            videoIds[1]
          ]
        )
      }
    }
    
    // Complete the job
    await db.query(
      `UPDATE processing_jobs 
       SET status = $1, progress = $2, completed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      ['completed', 100, jobId]
    )
    
    // Update project status
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['completed', projectId]
    )
    
    console.log(`Video generation completed for job ${jobId}`)
  } catch (error) {
    console.error(`Error in background video generation for job ${jobId}:`, error)
    
    // Update job with error
    await db.query(
      `UPDATE processing_jobs 
       SET status = $1, error_message = $2, updated_at = NOW()
       WHERE id = $3`,
      ['failed', error instanceof Error ? error.message : 'Video generation failed', jobId]
    )
    
    // Update project status
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['failed', projectId]
    )
  }
}