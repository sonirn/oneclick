// Enhanced Job Processor - Serverless Compatible Version
import { createClient as createRedisClient } from 'redis';

// Redis client setup - Optional for serverless
let redis: any = null;

try {
  if (process.env.REDIS_URL) {
    redis = createRedisClient({
      url: process.env.REDIS_URL
    });
  } else if (process.env.REDIS_HOST) {
    redis = createRedisClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379')
      },
      password: process.env.REDIS_PASSWORD
    });
  }
} catch (error) {
  console.warn('Redis not available, using in-memory fallback');
}

interface JobData {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  data: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory fallback for development/serverless
const inMemoryJobs = new Map<string, JobData>();

class EnhancedJobProcessor {
  private isRedisConnected = false;

  async connect() {
    if (redis && !this.isRedisConnected) {
      try {
        await redis.connect();
        this.isRedisConnected = true;
        console.log('Redis connected successfully');
      } catch (error) {
        console.warn('Redis connection failed, using in-memory fallback');
      }
    }
  }

  async disconnect() {
    if (redis && this.isRedisConnected) {
      await redis.disconnect();
      this.isRedisConnected = false;
    }
  }

  // Create job
  async createJob(type: string, data: any): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: JobData = {
      id: jobId,
      type,
      status: 'pending',
      progress: 0,
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.isRedisConnected && redis) {
      try {
        await redis.hSet(`job:${jobId}`, {
          ...job,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
          data: JSON.stringify(data)
        });
      } catch (error) {
        console.warn('Redis operation failed, using in-memory fallback');
        inMemoryJobs.set(jobId, job);
      }
    } else {
      inMemoryJobs.set(jobId, job);
    }

    return jobId;
  }

  // Update job status
  async updateJobStatus(jobId: string, status: JobData['status'], progress: number, error?: string) {
    const updates = {
      status,
      progress,
      updatedAt: new Date().toISOString(),
      ...(error && { error })
    };

    if (this.isRedisConnected && redis) {
      try {
        await redis.hSet(`job:${jobId}`, updates);
      } catch (redisError) {
        const job = inMemoryJobs.get(jobId);
        if (job) {
          Object.assign(job, updates, { updatedAt: new Date() });
        }
      }
    } else {
      const job = inMemoryJobs.get(jobId);
      if (job) {
        Object.assign(job, updates, { updatedAt: new Date() });
      }
    }
  }

  // Get job status
  async getJobStatus(jobId: string): Promise<JobData | null> {
    if (this.isRedisConnected && redis) {
      try {
        const jobData = await redis.hGetAll(`job:${jobId}`);
        if (Object.keys(jobData).length === 0) return null;

        return {
          ...jobData,
          createdAt: new Date(jobData.createdAt),
          updatedAt: new Date(jobData.updatedAt),
          data: JSON.parse(jobData.data),
          progress: parseInt(jobData.progress)
        };
      } catch (error) {
        return inMemoryJobs.get(jobId) || null;
      }
    }

    return inMemoryJobs.get(jobId) || null;
  }

  // Get jobs by type
  async getJobsByType(type: string, limit = 50): Promise<JobData[]> {
    if (this.isRedisConnected && redis) {
      try {
        const keys = await redis.keys('job:*');
        const jobs: JobData[] = [];

        for (const key of keys.slice(0, limit)) {
          const jobData = await redis.hGetAll(key);
          if (jobData.type === type) {
            jobs.push({
              ...jobData,
              createdAt: new Date(jobData.createdAt),
              updatedAt: new Date(jobData.updatedAt),
              data: JSON.parse(jobData.data),
              progress: parseInt(jobData.progress)
            });
          }
        }

        return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } catch (error) {
        // Fallback to in-memory
      }
    }

    return Array.from(inMemoryJobs.values())
      .filter(job => job.type === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Get queue health - simplified for serverless
  async getQueueHealth() {
    const pendingJobs = Array.from(inMemoryJobs.values()).filter(j => j.status === 'pending').length;
    const processingJobs = Array.from(inMemoryJobs.values()).filter(j => j.status === 'processing').length;
    const completedJobs = Array.from(inMemoryJobs.values()).filter(j => j.status === 'completed').length;
    const failedJobs = Array.from(inMemoryJobs.values()).filter(j => j.status === 'failed').length;

    return {
      video_generation: {
        waiting: pendingJobs,
        active: processingJobs,
        completed: completedJobs,
        failed: failedJobs
      },
      audio_generation: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0
      },
      redis_connected: this.isRedisConnected
    };
  }

  // Process video generation job
  async processVideoGenerationJob(jobId: string, projectId: string, plan: any) {
    await this.updateJobStatus(jobId, 'processing', 10);

    try {
      // Simulate video generation processing
      await this.updateJobStatus(jobId, 'processing', 50);
      
      // In a real implementation, this would call the actual video generation service
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.updateJobStatus(jobId, 'completed', 100);
      
      return {
        success: true,
        jobId,
        message: 'Video generation completed'
      };
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', 0, error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const enhancedJobProcessor = new EnhancedJobProcessor();

// Auto-connect if Redis is available
if (typeof window === 'undefined') {
  enhancedJobProcessor.connect().catch(console.warn);
}