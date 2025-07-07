import { NextRequest, NextResponse } from 'next/server'
import { r2Storage } from '@/lib/cloudflare-r2'

export async function GET() {
  try {
    // Test R2 connection by trying to get a signed URL
    const result = await r2Storage.getSignedUploadUrl('test-file.txt', 'text/plain')
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'R2 storage connection successful',
        hasSignedUrl: !!result.url
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'R2 storage connection failed',
        details: result.error
      }, { status: 500 })
    }
  } catch (error) {
    console.error('R2 test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'R2 storage connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}