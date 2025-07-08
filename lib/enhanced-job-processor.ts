// Enhanced Background Job Processing with Redis/Bull
import Bull from 'bull';
import Redis from 'redis';
import { db } from './database';
import { videoGenerationService } from './video-generation-service';

// Redis client setup
const redis = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

// Job queues
const videoGenerationQueue = new Bull('video generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
});

const audioGenerationQueue = new Bull('audio generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
});

// Job data interfaces
interface VideoGenerationJobData {
  projectId: string;
  plan: any;
  jobId: string;
}

interface AudioGenerationJobData {
  projectId: string;
  audioStrategy: any;
  jobId: string;
}

// Video generation job processor
videoGenerationQueue.process(async (job) => {
  const { projectId, plan, jobId } = job.data as VideoGenerationJobData;
  
  try {
    console.log(`Processing video generation job ${jobId} for project ${projectId}`);
    
    // Update job status
    await db.query(
      'UPDATE processing_jobs SET status = $1, updated_at = NOW() WHERE id = $2',
      ['processing', jobId]
    );

    // Process video generation
    const result = await videoGenerationService.generateVideo(projectId, plan);
    
    if (result.success) {
      await db.query(
        'UPDATE processing_jobs SET status = $1, progress = $2, completed_at = NOW() WHERE id = $3',
        ['completed', 100, jobId]
      );
      
      await db.query(
        'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
        ['completed', projectId]
      );
      
      console.log(`Video generation job ${jobId} completed successfully`);
    } else {
      throw new Error(result.error || 'Video generation failed');
    }
  } catch (error) {
    console.error(`Video generation job ${jobId} failed:`, error);
    
    await db.query(
      'UPDATE processing_jobs SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3',
      ['failed', error instanceof Error ? error.message : 'Processing failed', jobId]
    );
    
    await db.query(
      'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2',
      ['failed', projectId]
    );
    
    throw error;
  }
});

// Audio generation job processor
audioGenerationQueue.process(async (job) => {
  const { projectId, audioStrategy, jobId } = job.data as AudioGenerationJobData;
  
  try {
    console.log(`Processing audio generation job ${jobId} for project ${projectId}`);
    
    // Process audio generation using ElevenLabs
    // Implementation would go here
    
    console.log(`Audio generation job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Audio generation job ${jobId} failed:`, error);
    throw error;
  }
});

// Enhanced job management service
export const enhancedJobProcessor = {
  // Add video generation job to queue
  addVideoGenerationJob: async (projectId: string, plan: any, jobId: string) => {
    const job = await videoGenerationQueue.add(
      'generate-video',
      { projectId, plan, jobId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        delay: 5000, // 5 second delay before starting
      }
    );
    
    console.log(`Video generation job ${job.id} queued for project ${projectId}`);
    return job;
  },

  // Add audio generation job to queue
  addAudioGenerationJob: async (projectId: string, audioStrategy: any, jobId: string) => {
    const job = await audioGenerationQueue.add(
      'generate-audio',
      { projectId, audioStrategy, jobId },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
    
    console.log(`Audio generation job ${job.id} queued for project ${projectId}`);
    return job;
  },

  // Get job statistics
  getJobStats: async () => {
    const videoStats = await videoGenerationQueue.getJobCounts();
    const audioStats = await audioGenerationQueue.getJobCounts();
    
    return {
      video_generation: videoStats,
      audio_generation: audioStats,
      total_active: videoStats.active + audioStats.active,
      total_waiting: videoStats.waiting + audioStats.waiting,
      total_completed: videoStats.completed + audioStats.completed,
      total_failed: videoStats.failed + audioStats.failed
    };
  },

  // Clean up old jobs
  cleanupOldJobs: async (ageInHours: number = 24) => {
    const cutoff = Date.now() - (ageInHours * 60 * 60 * 1000);
    
    await videoGenerationQueue.clean(cutoff, 'completed');
    await videoGenerationQueue.clean(cutoff, 'failed');
    await audioGenerationQueue.clean(cutoff, 'completed');
    await audioGenerationQueue.clean(cutoff, 'failed');
    
    console.log(`Cleaned up jobs older than ${ageInHours} hours`);
  },

  // Cancel job
  cancelJob: async (jobId: string, queueType: 'video' | 'audio') => {
    const queue = queueType === 'video' ? videoGenerationQueue : audioGenerationQueue;
    
    try {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log(`Job ${jobId} cancelled`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error cancelling job ${jobId}:`, error);
      return false;
    }
  },

  // Get queue health
  getQueueHealth: async () => {
    const videoHealth = await videoGenerationQueue.checkHealth();
    const audioHealth = await audioGenerationQueue.checkHealth();
    
    return {
      video_queue: videoHealth,
      audio_queue: audioHealth,
      redis_connected: redis.connected,
      timestamp: new Date().toISOString()
    };
  }
};

// Progress tracking with WebSocket support
export const progressTracker = {
  // Track job progress
  trackJobProgress: async (jobId: string, progress: number, message?: string) => {
    try {
      await db.query(
        'UPDATE processing_jobs SET progress = $1, updated_at = NOW() WHERE id = $2',
        [progress, jobId]
      );
      
      // In production, emit WebSocket event here
      // socketService.emit('job-progress', { jobId, progress, message });
      
      console.log(`Job ${jobId} progress: ${progress}%${message ? ` - ${message}` : ''}`);
    } catch (error) {
      console.error(`Error tracking progress for job ${jobId}:`, error);
    }
  },

  // Track video segment progress
  trackVideoSegmentProgress: async (videoId: string, status: string, progress: number) => {
    try {
      await db.query(
        'UPDATE generated_videos SET status = $1, progress = $2, updated_at = NOW() WHERE id = $3',
        [status, progress, videoId]
      );
      
      console.log(`Video segment ${videoId} progress: ${progress}% (${status})`);
    } catch (error) {
      console.error(`Error tracking video segment progress for ${videoId}:`, error);
    }
  }
};

// Job queue event listeners
videoGenerationQueue.on('completed', (job) => {
  console.log(`Video generation job ${job.id} completed`);
});

videoGenerationQueue.on('failed', (job, err) => {
  console.error(`Video generation job ${job.id} failed:`, err);
});

audioGenerationQueue.on('completed', (job) => {
  console.log(`Audio generation job ${job.id} completed`);
});

audioGenerationQueue.on('failed', (job, err) => {
  console.error(`Audio generation job ${job.id} failed:`, err);
});

// Initialize job processor
export const initializeJobProcessor = async () => {
  console.log('Initializing enhanced job processor...');
  
  // Start cleanup routine
  setInterval(async () => {
    await enhancedJobProcessor.cleanupOldJobs();
  }, 60 * 60 * 1000); // Run every hour
  
  console.log('Enhanced job processor initialized');
};

// Export queues for monitoring
export { videoGenerationQueue, audioGenerationQueue };