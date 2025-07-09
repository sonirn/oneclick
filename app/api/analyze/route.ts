import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { videoAnalysisService } from '@/lib/enhanced-ai-services'

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()

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

    if (!project.sample_video_url) {
      return NextResponse.json({ 
        success: false, 
        error: 'No sample video found for analysis' 
      }, { status: 400 })
    }

    // Update project status to analyzing
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['analyzing', projectId]
    )

    // Create processing job
    const jobQuery = `
      INSERT INTO processing_jobs (project_id, job_type, status, job_data, started_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `
    
    const jobResult = await db.query(jobQuery, [
      projectId,
      'video_analysis',
      'processing',
      JSON.stringify({
        video_url: project.sample_video_url,
        character_image_url: project.character_image_url,
        audio_file_url: project.audio_file_url
      })
    ])

    const jobId = jobResult.rows[0].id

    // Start analysis (this could be moved to background processing later)
    try {
      console.log('Starting video analysis for project:', projectId)
      
      const analysisResult = await videoAnalysisService.analyzeVideo(
        project.sample_video_url,
        project.character_image_url,
        project.audio_file_url
      )

      if (analysisResult.success && 'analysis' in analysisResult) {
        // Update project with analysis results
        await db.query(
          `UPDATE projects 
           SET analysis_result = $1, status = $2, updated_at = NOW() 
           WHERE id = $3`,
          [JSON.stringify(analysisResult.analysis), 'analyzed', projectId]
        )

        // Update job status
        await db.query(
          `UPDATE processing_jobs 
           SET status = $1, progress = $2, completed_at = NOW(), updated_at = NOW()
           WHERE id = $3`,
          ['completed', 100, jobId]
        )

        return NextResponse.json({ 
          success: true, 
          analysis: analysisResult.analysis,
          job_id: jobId,
          message: 'Video analysis completed successfully'
        })
      } else {
        // Update job with error
        await db.query(
          `UPDATE processing_jobs 
           SET status = $1, error_message = $2, updated_at = NOW()
           WHERE id = $3`,
          ['failed', analysisResult.error, jobId]
        )

        // Update project status
        await db.query(
          'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
          ['analysis_failed', projectId]
        )

        return NextResponse.json({ 
          success: false, 
          error: analysisResult.error,
          job_id: jobId
        }, { status: 500 })
      }
    } catch (analysisError) {
      console.error('Analysis error:', analysisError)
      
      // Update job with error
      await db.query(
        `UPDATE processing_jobs 
         SET status = $1, error_message = $2, updated_at = NOW()
         WHERE id = $3`,
        ['failed', analysisError instanceof Error ? analysisError.message : 'Analysis failed', jobId]
      )

      // Update project status
      await db.query(
        'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
        ['analysis_failed', projectId]
      )

      return NextResponse.json({ 
        success: false, 
        error: 'Analysis processing failed',
        job_id: jobId
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in analyze API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start analysis' 
    }, { status: 500 })
  }
}