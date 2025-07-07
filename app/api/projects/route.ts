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
    const contentType = request.headers.get('content-type') || ''
    
    let title: string, description: string, userId: string
    let videoFile: File | null = null, imageFile: File | null = null, audioFile: File | null = null
    let sampleVideoUrl: string | null = null, characterImageUrl: string | null = null, audioFileUrl: string | null = null

    if (contentType.includes('application/json')) {
      // Handle JSON request (for testing or API calls)
      const body = await request.json()
      title = body.title
      description = body.description || ''
      userId = body.userId
      
      // For JSON requests, we can accept URLs directly or create mock data
      if (body.mockData) {
        const projectId = uuidv4()
        sampleVideoUrl = `https://example.com/videos/${projectId}.mp4`
        characterImageUrl = body.characterImageUrl || `https://example.com/images/${projectId}.jpg`
        audioFileUrl = body.audioFileUrl || `https://example.com/audio/${projectId}.mp3`
      } else {
        sampleVideoUrl = body.sampleVideoUrl
        characterImageUrl = body.characterImageUrl
        audioFileUrl = body.audioFileUrl
      }
    } else {
      // Handle FormData request (from frontend file uploads)
      const formData = await request.formData()
      
      title = formData.get('title') as string
      description = formData.get('description') as string
      userId = formData.get('userId') as string
      videoFile = formData.get('video') as File
      imageFile = formData.get('image') as File | null
      audioFile = formData.get('audio') as File | null
    }

    if (!title || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields (title and userId)' 
      }, { status: 400 })
    }

    // For FormData requests, we need a video file
    if (contentType.includes('multipart/form-data') && !videoFile) {
      return NextResponse.json({ 
        success: false, 
        error: 'Video file is required for file uploads' 
      }, { status: 400 })
    }

    // For JSON requests, we need at least a sample video URL
    if (contentType.includes('application/json') && !sampleVideoUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Sample video URL is required for JSON requests' 
      }, { status: 400 })
    }

    const projectId = uuidv4()
    const uploads: { [key: string]: string } = {}

    // Handle file uploads for FormData requests
    if (videoFile) {
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
    } else {
      // Use provided URLs for JSON requests
      uploads.sample_video_url = sampleVideoUrl!
      if (characterImageUrl) uploads.character_image_url = characterImageUrl
      if (audioFileUrl) uploads.audio_file_url = audioFileUrl
    }

    // Ensure user exists in database (create if not exists)
    const userQuery = `
      INSERT INTO users (id, email, name) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    `
    
    await db.query(userQuery, [userId, `user-${userId}@example.com`, `User ${userId}`])

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