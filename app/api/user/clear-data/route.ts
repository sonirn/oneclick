import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // Start transaction
    await db.query('BEGIN')

    try {
      // Delete generated videos
      await db.query(
        `DELETE FROM generated_videos 
         WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)`,
        [userId]
      )

      // Delete processing jobs
      await db.query(
        `DELETE FROM processing_jobs 
         WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)`,
        [userId]
      )

      // Delete projects
      await db.query('DELETE FROM projects WHERE user_id = $1', [userId])

      // Delete user settings
      await db.query('DELETE FROM user_settings WHERE user_id = $1', [userId])

      // Note: We don't delete the user record itself, just their data
      // In production, you might want to handle this differently

      await db.query('COMMIT')

      return NextResponse.json({ 
        success: true, 
        message: 'All user data cleared successfully' 
      })
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error clearing user data:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to clear user data' 
    }, { status: 500 })
  }
}