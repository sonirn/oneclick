import { NextRequest, NextResponse } from 'next/server'
import { enhancedJobProcessor } from '@/lib/enhanced-job-processor'

export async function GET(request: NextRequest) {
  try {
    const health = await enhancedJobProcessor.getQueueHealth()
    
    return NextResponse.json({
      success: true,
      queue_health: health,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting job statistics:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get job statistics' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, jobId } = await request.json()
    
    if (action === 'cancel' && jobId) {
      // Update job status to cancelled (simplified for serverless)
      await enhancedJobProcessor.updateJobStatus(jobId, 'failed', 0, 'Cancelled by user')
      
      return NextResponse.json({
        success: true,
        message: 'Job cancelled successfully'
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 })
  } catch (error) {
    console.error('Error processing job action:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process job action' 
    }, { status: 500 })
  }
}