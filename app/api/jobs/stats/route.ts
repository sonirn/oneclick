import { NextRequest, NextResponse } from 'next/server'
import { enhancedJobProcessor, progressTracker } from '@/lib/enhanced-job-processor'

export async function GET(request: NextRequest) {
  try {
    const stats = await enhancedJobProcessor.getJobStats()
    const health = await enhancedJobProcessor.getQueueHealth()
    
    return NextResponse.json({
      success: true,
      statistics: stats,
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
    const { action, jobId, queueType } = await request.json()
    
    if (action === 'cancel' && jobId && queueType) {
      const cancelled = await enhancedJobProcessor.cancelJob(jobId, queueType)
      
      return NextResponse.json({
        success: cancelled,
        message: cancelled ? 'Job cancelled successfully' : 'Job not found or already completed'
      })
    }
    
    if (action === 'cleanup') {
      await enhancedJobProcessor.cleanupOldJobs()
      
      return NextResponse.json({
        success: true,
        message: 'Old jobs cleaned up successfully'
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