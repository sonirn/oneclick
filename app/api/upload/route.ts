import { NextRequest, NextResponse } from 'next/server'
import { r2Storage } from '@/lib/cloudflare-r2'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileType = searchParams.get('type') || 'general'
    const fileName = searchParams.get('fileName') || 'file'
    const contentType = searchParams.get('contentType') || 'application/octet-stream'

    const key = `uploads/${fileType}/${Date.now()}-${fileName}`
    
    const result = await r2Storage.getSignedUploadUrl(key, contentType)
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      uploadUrl: result.url,
      fileKey: key,
      publicUrl: `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${key}`
    })
  } catch (error) {
    console.error('Error generating upload URL:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate upload URL' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileKey = searchParams.get('key')

    if (!fileKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'File key is required' 
      }, { status: 400 })
    }

    const result = await r2Storage.getSignedDownloadUrl(fileKey)
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      downloadUrl: result.url 
    })
  } catch (error) {
    console.error('Error generating download URL:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate download URL' 
    }, { status: 500 })
  }
}