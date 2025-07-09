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

    const query = `
      SELECT 
        gv.*,
        p.title as project_title,
        p.user_id
      FROM generated_videos gv
      JOIN projects p ON gv.project_id = p.id
      WHERE p.user_id = $1 
        AND gv.status = 'completed'
        AND gv.video_url IS NOT NULL
        AND gv.expires_at > NOW()
      ORDER BY gv.created_at DESC
    `
    
    const result = await db.query(query, [userId])
    
    // Add mock data for favorites and views (would be from separate tables in production)
    const videos = result.rows.map(video => ({
      ...video,
      is_favorite: Math.random() > 0.7, // Mock favorite status
      view_count: Math.floor(Math.random() * 50), // Mock view count
      download_count: Math.floor(Math.random() * 20) // Mock download count
    }))
    
    return NextResponse.json({ 
      success: true, 
      videos 
    })
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch videos' 
    }, { status: 500 })
  }
}