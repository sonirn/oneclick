import { db } from './database'

// Background job processing utilities
export const jobProcessor = {
  // Process pending jobs
  processPendingJobs: async () => {
    try {
      const pendingJobs = await db.query(
        'SELECT * FROM processing_jobs WHERE status = $1 ORDER BY created_at ASC',
        ['pending']
      )

      for (const job of pendingJobs.rows) {
        await jobProcessor.processJob(job)
      }
    } catch (error) {
      console.error('Error processing pending jobs:', error)
    }
  },

  // Process a single job
  processJob: async (job: any) => {
    try {
      console.log(`Processing job ${job.id} of type ${job.job_type}`)

      // Update job status to processing
      await db.query(
        `UPDATE processing_jobs 
         SET status = $1, started_at = NOW(), updated_at = NOW() 
         WHERE id = $2`,
        ['processing', job.id]
      )

      // Process based on job type
      switch (job.job_type) {
        case 'video_analysis':
          await jobProcessor.processVideoAnalysis(job)
          break
        case 'plan_generation':
          await jobProcessor.processPlanGeneration(job)
          break
        case 'video_generation':
          await jobProcessor.processVideoGeneration(job)
          break
        default:
          throw new Error(`Unknown job type: ${job.job_type}`)
      }
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error)
      
      // Update job with error status
      await db.query(
        `UPDATE processing_jobs 
         SET status = $1, error_message = $2, updated_at = NOW() 
         WHERE id = $3`,
        ['failed', error instanceof Error ? error.message : 'Processing failed', job.id]
      )
    }
  },

  // Process video analysis job
  processVideoAnalysis: async (job: any) => {
    // Implementation would go here
    // For now, we'll just mark it as completed since analysis is handled in API
    await db.query(
      `UPDATE processing_jobs 
       SET status = $1, progress = $2, completed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      ['completed', 100, job.id]
    )
  },

  // Process plan generation job  
  processPlanGeneration: async (job: any) => {
    // Implementation would go here
    // For now, we'll just mark it as completed since plan generation is handled in API
    await db.query(
      `UPDATE processing_jobs 
       SET status = $1, progress = $2, completed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      ['completed', 100, job.id]
    )
  },

  // Process video generation job
  processVideoGeneration: async (job: any) => {
    // This would be the main video generation logic
    // For Phase 2, we'll implement the framework
    console.log('Video generation job processing - to be implemented in Phase 3')
    
    // Simulate processing with progress updates
    for (let progress = 0; progress <= 100; progress += 20) {
      await db.query(
        'UPDATE processing_jobs SET progress = $1, updated_at = NOW() WHERE id = $2',
        [progress, job.id]
      )
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    await db.query(
      `UPDATE processing_jobs 
       SET status = $1, progress = $2, completed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      ['completed', 100, job.id]
    )
  },

  // Get job progress
  getJobProgress: async (jobId: string) => {
    try {
      const result = await db.query(
        'SELECT status, progress, error_message FROM processing_jobs WHERE id = $1',
        [jobId]
      )
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Job not found' }
      }

      return {
        success: true,
        ...result.rows[0]
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get job progress'
      }
    }
  },

  // Clean up old jobs
  cleanupOldJobs: async (daysOld: number = 7) => {
    try {
      await db.query(
        `DELETE FROM processing_jobs 
         WHERE created_at < NOW() - INTERVAL '${daysOld} days' 
         AND status IN ('completed', 'failed', 'cancelled')`,
        []
      )
      console.log(`Cleaned up jobs older than ${daysOld} days`)
    } catch (error) {
      console.error('Error cleaning up old jobs:', error)
    }
  }
}

// Start background job processor (in production, this would be a separate service)
export const startJobProcessor = () => {
  console.log('Starting background job processor...')
  
  // Process jobs every 30 seconds
  setInterval(async () => {
    await jobProcessor.processPendingJobs()
  }, 30000)

  // Clean up old jobs daily
  setInterval(async () => {
    await jobProcessor.cleanupOldJobs()
  }, 24 * 60 * 60 * 1000)
}