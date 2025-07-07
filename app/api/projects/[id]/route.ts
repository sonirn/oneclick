import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { r2Storage } from '@/lib/cloudflare-r2'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    const query = `
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'id', gv.id,
            'video_url', gv.video_url,
            'thumbnail_url', gv.thumbnail_url,
            'duration', gv.duration,
            'file_size', gv.file_size,
            'quality', gv.quality,
            'status', gv.status,
            'ai_model_used', gv.ai_model_used,
            'created_at', gv.created_at,
            'expires_at', gv.expires_at
          )
        ) FILTER (WHERE gv.id IS NOT NULL) as generated_videos
      FROM projects p
      LEFT JOIN generated_videos gv ON p.id = gv.project_id
      WHERE p.id = $1
      GROUP BY p.id
    `

    const result = await db.query(query, [projectId])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      project: result.rows[0] 
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch project' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    // Get project details first
    const projectQuery = 'SELECT * FROM projects WHERE id = $1'
    const projectResult = await db.query(projectQuery, [projectId])
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 })
    }

    const project = projectResult.rows[0]

    // Delete files from R2
    const filesToDelete = []
    if (project.sample_video_url) {
      const videoKey = project.sample_video_url.split('/').pop()
      if (videoKey) filesToDelete.push(videoKey)
    }
    if (project.character_image_url) {
      const imageKey = project.character_image_url.split('/').pop()
      if (imageKey) filesToDelete.push(imageKey)
    }
    if (project.audio_file_url) {
      const audioKey = project.audio_file_url.split('/').pop()
      if (audioKey) filesToDelete.push(audioKey)
    }

    // Delete generated videos from R2
    const generatedVideosQuery = 'SELECT video_url FROM generated_videos WHERE project_id = $1'
    const generatedVideosResult = await db.query(generatedVideosQuery, [projectId])
    
    for (const video of generatedVideosResult.rows) {
      if (video.video_url) {
        const videoKey = video.video_url.split('/').pop()
        if (videoKey) filesToDelete.push(videoKey)
      }
    }

    // Delete files from R2
    for (const fileKey of filesToDelete) {
      await r2Storage.deleteFile(fileKey)
    }

    // Delete project from database (cascade will handle related records)
    const deleteQuery = 'DELETE FROM projects WHERE id = $1'
    await db.query(deleteQuery, [projectId])

    return NextResponse.json({ 
      success: true, 
      message: 'Project deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete project' 
    }, { status: 500 })
  }
}