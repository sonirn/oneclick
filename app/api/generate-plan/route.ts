import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { videoAnalysisService } from '@/lib/enhanced-ai-services'

export async function POST(request: NextRequest) {
  try {
    const { projectId, userRequirements } = await request.json()

    if (!projectId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    // Get project details with analysis
    const projectQuery = 'SELECT * FROM projects WHERE id = $1'
    const projectResult = await db.query(projectQuery, [projectId])
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 })
    }

    const project = projectResult.rows[0]

    if (!project.analysis_result) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project needs to be analyzed first' 
      }, { status: 400 })
    }

    // Parse the analysis result JSON string
    let parsedAnalysis;
    try {
      parsedAnalysis = typeof project.analysis_result === 'string' 
        ? JSON.parse(project.analysis_result) 
        : project.analysis_result;
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid analysis result format. Please re-analyze the project.' 
      }, { status: 400 })
    }

    // Update project status to planning
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['planning', projectId]
    )

    // Create processing job
    const jobQuery = `
      INSERT INTO processing_jobs (project_id, job_type, status, job_data, started_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `
    
    const jobResult = await db.query(jobQuery, [
      projectId,
      'plan_generation',
      'processing',
      JSON.stringify({
        analysis: project.analysis_result,
        user_requirements: userRequirements
      })
    ])

    const jobId = jobResult.rows[0].id

    try {
      console.log('Starting plan generation for project:', projectId)
      
      const planResult = await videoAnalysisService.generatePlan(
        parsedAnalysis,
        userRequirements
      )

      if (planResult.success && 'plan' in planResult) {
        // Update project with plan
        await db.query(
          `UPDATE projects 
           SET generation_plan = $1, status = $2, updated_at = NOW() 
           WHERE id = $3`,
          [JSON.stringify(planResult.plan), 'plan_ready', projectId]
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
          plan: planResult.plan,
          job_id: jobId,
          message: 'Generation plan created successfully'
        })
      } else {
        // Update job with error
        await db.query(
          `UPDATE processing_jobs 
           SET status = $1, error_message = $2, updated_at = NOW()
           WHERE id = $3`,
          ['failed', 'error' in planResult ? planResult.error : 'Plan generation failed', jobId]
        )

        // Update project status
        await db.query(
          'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
          ['plan_failed', projectId]
        )

        return NextResponse.json({ 
          success: false, 
          error: 'error' in planResult ? planResult.error : 'Plan generation failed',
          job_id: jobId
        }, { status: 500 })
      }
    } catch (planError) {
      console.error('Plan generation error:', planError)
      
      // Update job with error
      await db.query(
        `UPDATE processing_jobs 
         SET status = $1, error_message = $2, updated_at = NOW()
         WHERE id = $3`,
        ['failed', planError instanceof Error ? planError.message : 'Plan generation failed', jobId]
      )

      // Update project status
      await db.query(
        'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
        ['plan_failed', projectId]
      )

      return NextResponse.json({ 
        success: false, 
        error: 'Plan generation processing failed',
        job_id: jobId
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in generate-plan API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start plan generation' 
    }, { status: 500 })
  }
}