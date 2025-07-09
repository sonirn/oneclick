import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function DELETE(
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

    // Get video details first
    const videoQuery = 'SELECT * FROM generated_videos WHERE id = $1';
    const videoResult = await db.query(videoQuery, [videoId]);
    
    if (videoResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Video not found' 
      }, { status: 404 });
    }

    const video = videoResult.rows[0];

    // In production, you would also delete the video file from storage
    // await deleteFromCloudflareR2(video.video_url)

    // Delete video record
    await db.query('DELETE FROM generated_videos WHERE id = $1', [videoId]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Video deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete video' 
    }, { status: 500 });
  }
}