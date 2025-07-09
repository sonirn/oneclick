import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const videoId = resolvedParams.id;

    if (!videoId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Video ID is required' 
      }, { status: 400 });
    }

    // Check if video exists
    const videoQuery = 'SELECT id FROM generated_videos WHERE id = $1';
    const videoResult = await db.query(videoQuery, [videoId]);
    
    if (videoResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Video not found' 
      }, { status: 404 });
    }

    // In production, you would have a separate favorites table
    // For now, we'll just return success since the frontend manages state
    // await db.query('INSERT INTO video_favorites (video_id, user_id) VALUES ($1, $2) ON CONFLICT (video_id, user_id) DO NOTHING', [videoId, userId])
    
    return NextResponse.json({ 
      success: true, 
      message: 'Favorite status updated' 
    });
  } catch (error) {
    console.error('Error updating favorite:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update favorite' 
    }, { status: 500 });
  }
}