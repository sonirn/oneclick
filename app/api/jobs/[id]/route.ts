import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    const query = `
      SELECT 
        pj.*,
        p.title as project_title,
        p.status as project_status
      FROM processing_jobs pj
      JOIN projects p ON pj.project_id = p.id
      WHERE pj.id = $1
    `

    const result = await db.query(query, [jobId])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Job not found' 
      }, { status: 404 })
    }

    const job = result.rows[0]

    return NextResponse.json({ 
      success: true, 
      job: {
        id: job.id,
        project_id: job.project_id,
        project_title: job.project_title,
        project_status: job.project_status,
        job_type: job.job_type,
        status: job.status,
        progress: job.progress,
        error_message: job.error_message,
        started_at: job.started_at,
        completed_at: job.completed_at,
        created_at: job.created_at,
        updated_at: job.updated_at
      }
    })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch job status' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    // Cancel the job by updating its status
    const result = await db.query(
      `UPDATE processing_jobs 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 AND status IN ('pending', 'processing')
       RETURNING *`,
      ['cancelled', jobId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Job not found or cannot be cancelled' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Job cancelled successfully',
      job: result.rows[0]
    })
  } catch (error) {
    console.error('Error cancelling job:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to cancel job' 
    }, { status: 500 })
  }
}