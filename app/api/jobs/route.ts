import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const jobType = searchParams.get('jobType')

    let query = `
      SELECT 
        pj.*,
        p.title as project_title,
        p.user_id
      FROM processing_jobs pj
      JOIN projects p ON pj.project_id = p.id
    `
    const params: any[] = []
    const conditions: string[] = []

    if (projectId) {
      conditions.push(`pj.project_id = $${params.length + 1}`)
      params.push(projectId)
    }

    if (status) {
      conditions.push(`pj.status = $${params.length + 1}`)
      params.push(status)
    }

    if (jobType) {
      conditions.push(`pj.job_type = $${params.length + 1}`)
      params.push(jobType)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` ORDER BY pj.created_at DESC`

    const result = await db.query(query, params)
    
    return NextResponse.json({ 
      success: true, 
      jobs: result.rows.map(job => ({
        id: job.id,
        project_id: job.project_id,
        project_title: job.project_title,
        job_type: job.job_type,
        status: job.status,
        progress: job.progress,
        error_message: job.error_message,
        started_at: job.started_at,
        completed_at: job.completed_at,
        created_at: job.created_at,
        updated_at: job.updated_at
      }))
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch jobs' 
    }, { status: 500 })
  }
}