import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id

    if (!videoId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Video ID is required' 
      }, { status: 400 })
    }

    // Get video details
    const videoQuery = 'SELECT * FROM generated_videos WHERE id = $1'
    const videoResult = await db.query(videoQuery, [videoId])
    
    if (videoResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Video not found' 
      }, { status: 404 })
    }

    const video = videoResult.rows[0]

    if (!video.video_url) {
      return NextResponse.json({ 
        success: false, 
        error: 'Video file not available' 
      }, { status: 404 })
    }

    // In production, you would fetch the video from Cloudflare R2
    // For now, we'll redirect to the video URL
    
    try {
      // Increment download count (in production, this would be in a separate table)
      await db.query(
        'UPDATE generated_videos SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1',
        [videoId]
      )
    } catch (error) {
      // Don't fail the download if we can't update the count
      console.error('Error updating download count:', error)
    }

    // For now, redirect to the video URL
    // In production, you would stream the file from your storage
    return NextResponse.redirect(video.video_url)
  } catch (error) {
    console.error('Error downloading video:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to download video' 
    }, { status: 500 })
  }
}