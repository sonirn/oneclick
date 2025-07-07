import { NextRequest, NextResponse } from 'next/server'
import { db, initDatabase } from '@/lib/database'
import { r2Storage } from '@/lib/cloudflare-r2'
import { v4 as uuidv4 } from 'uuid'

// Initialize database on first load
initDatabase().catch(console.error)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

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
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `

    const result = await db.query(query, [userId])
    
    return NextResponse.json({ 
      success: true, 
      projects: result.rows 
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch projects' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const userId = formData.get('userId') as string
    const videoFile = formData.get('video') as File
    const imageFile = formData.get('image') as File | null
    const audioFile = formData.get('audio') as File | null

    if (!title || !userId || !videoFile) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Upload files to R2
    const projectId = uuidv4()
    const uploads: { [key: string]: string } = {}

    // Upload video
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())
    const videoKey = `projects/${projectId}/video-${Date.now()}.${videoFile.name.split('.').pop()}`
    const videoUpload = await r2Storage.uploadFile(videoKey, videoBuffer, videoFile.type)
    
    if (!videoUpload.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload video' 
      }, { status: 500 })
    }
    uploads.sample_video_url = videoUpload.url

    // Upload image if provided
    if (imageFile) {
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
      const imageKey = `projects/${projectId}/image-${Date.now()}.${imageFile.name.split('.').pop()}`
      const imageUpload = await r2Storage.uploadFile(imageKey, imageBuffer, imageFile.type)
      
      if (imageUpload.success) {
        uploads.character_image_url = imageUpload.url
      }
    }

    // Upload audio if provided
    if (audioFile) {
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
      const audioKey = `projects/${projectId}/audio-${Date.now()}.${audioFile.name.split('.').pop()}`
      const audioUpload = await r2Storage.uploadFile(audioKey, audioBuffer, audioFile.type)
      
      if (audioUpload.success) {
        uploads.audio_file_url = audioUpload.url
      }
    }

    // Create project in database
    const query = `
      INSERT INTO projects (id, user_id, title, description, sample_video_url, character_image_url, audio_file_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `
    
    const values = [
      projectId,
      userId,
      title,
      description,
      uploads.sample_video_url,
      uploads.character_image_url || null,
      uploads.audio_file_url || null,
      'created'
    ]

    const result = await db.query(query, values)
    
    // Create initial processing job for video analysis
    const jobQuery = `
      INSERT INTO processing_jobs (project_id, job_type, status, job_data)
      VALUES ($1, $2, $3, $4)
    `
    
    await db.query(jobQuery, [
      projectId,
      'video_analysis',
      'pending',
      JSON.stringify({
        video_url: uploads.sample_video_url,
        character_image_url: uploads.character_image_url,
        audio_file_url: uploads.audio_file_url
      })
    ])

    return NextResponse.json({ 
      success: true, 
      project: result.rows[0] 
    })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create project' 
    }, { status: 500 })
  }
}