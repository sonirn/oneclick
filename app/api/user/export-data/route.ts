import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // Get user data
    const userResult = await db.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Get projects
    const projectsResult = await db.query(
      'SELECT * FROM projects WHERE user_id = $1',
      [userId]
    )

    // Get generated videos
    const videosResult = await db.query(
      `SELECT gv.* FROM generated_videos gv
       JOIN projects p ON gv.project_id = p.id
       WHERE p.user_id = $1`,
      [userId]
    )

    // Get processing jobs
    const jobsResult = await db.query(
      `SELECT pj.* FROM processing_jobs pj
       JOIN projects p ON pj.project_id = p.id
       WHERE p.user_id = $1`,
      [userId]
    )

    const userData = {
      user: userResult.rows[0],
      projects: projectsResult.rows,
      videos: videosResult.rows,
      jobs: jobsResult.rows,
      exported_at: new Date().toISOString()
    }

    const jsonData = JSON.stringify(userData, null, 2)

    return new NextResponse(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user_data_${userId}_${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to export user data' 
    }, { status: 500 })
  }
}