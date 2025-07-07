// Unified Video Generation Service
import { runwayService, RunwayGenerationRequest, RunwayGenerationResponse } from './runway-service';
import { googleVeoService, VeoGenerationRequest, VeoGenerationResponse } from './google-veo-service';
import { elevenLabsService, ElevenLabsVoiceRequest } from './elevenlabs-service';
import { db } from './database';

interface VideoSegment {
  segment_number: number;
  duration: number;
  description: string;
  visual_style: string;
  ai_model: string;
  prompt: string;
  text_overlay?: string;
  audio_notes?: string;
}

interface VideoGenerationPlan {
  plan_summary: string;
  total_duration: number;
  segments: VideoSegment[];
  audio_strategy: {
    type: 'custom' | 'generated' | 'effects';
    description: string;
    voice_requirements?: string;
    background_music?: string;
    sound_effects?: string[];
  };
}

interface VideoGenerationResult {
  success: boolean;
  jobId: string;
  videoIds: string[];
  estimatedTime: string;
  error?: string;
}

class VideoGenerationService {
  async generateVideo(projectId: string, plan: VideoGenerationPlan): Promise<VideoGenerationResult> {
    try {
      console.log(`Starting video generation for project ${projectId}`);
      
      // Create processing job
      const jobQuery = `
        INSERT INTO processing_jobs (project_id, job_type, status, job_data, started_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `;
      
      const jobResult = await db.query(jobQuery, [
        projectId,
        'video_generation',
        'processing',
        JSON.stringify({ plan, total_duration: plan.total_duration })
      ]);

      const jobId = jobResult.rows[0].id;
      const videoIds: string[] = [];

      // Process each segment
      for (const segment of plan.segments) {
        const videoId = `video_${Date.now()}_${segment.segment_number}`;
        videoIds.push(videoId);

        // Create video record
        await db.query(
          `INSERT INTO generated_videos 
           (id, project_id, aspect_ratio, status, ai_model_used, generation_params, duration)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            videoId,
            projectId,
            '9:16',
            'processing',
            segment.ai_model,
            JSON.stringify({
              segment_number: segment.segment_number,
              description: segment.description,
              prompt: segment.prompt,
              visual_style: segment.visual_style
            }),
            segment.duration
          ]
        );

        // Generate segment in background
        this.generateSegmentInBackground(videoId, segment, jobId);
      }

      // Generate audio if needed
      if (plan.audio_strategy.type === 'generated' && plan.audio_strategy.voice_requirements) {
        this.generateAudioInBackground(projectId, plan.audio_strategy, jobId);
      }

      return {
        success: true,
        jobId,
        videoIds,
        estimatedTime: this.calculateEstimatedTime(plan.segments.length)
      };
    } catch (error) {
      console.error('Video generation setup error:', error);
      return {
        success: false,
        jobId: '',
        videoIds: [],
        estimatedTime: '',
        error: error instanceof Error ? error.message : 'Video generation failed'
      };
    }
  }

  private async generateSegmentInBackground(videoId: string, segment: VideoSegment, jobId: string): Promise<void> {
    try {
      console.log(`Generating segment ${segment.segment_number} using ${segment.ai_model}`);
      
      let result: any;
      
      // Select AI model and generate
      switch (segment.ai_model) {
        case 'runway-gen4':
        case 'runway-gen3':
          const runwayRequest: RunwayGenerationRequest = {
            prompt: segment.prompt,
            model: segment.ai_model === 'runway-gen4' ? 'gen4_turbo' : 'gen3_alpha',
            duration: segment.duration,
            aspectRatio: '9:16'
          };
          result = await runwayService.generateVideo(runwayRequest);
          
          if (result.status === 'processing') {
            result = await runwayService.waitForCompletion(result.taskId);
          }
          break;

        case 'google-veo-3':
        case 'google-veo-2':
          const veoRequest: VeoGenerationRequest = {
            prompt: segment.prompt,
            model: segment.ai_model === 'google-veo-3' ? 'veo-3' : 'veo-2',
            duration: segment.duration,
            aspectRatio: '9:16',
            generateAudio: false
          };
          result = await googleVeoService.generateVideo(veoRequest);
          
          if (result.status === 'processing') {
            result = await googleVeoService.waitForCompletion(result.videoId);
          }
          break;

        default:
          throw new Error(`Unsupported AI model: ${segment.ai_model}`);
      }

      // Update video record with result
      if (result.status === 'completed' && result.videoUrl) {
        await db.query(
          `UPDATE generated_videos 
           SET status = $1, video_url = $2, file_size = $3, quality = $4, updated_at = NOW()
           WHERE id = $5`,
          ['completed', result.videoUrl, 25000000, 'HD', videoId]
        );
        
        console.log(`Segment ${segment.segment_number} completed successfully`);
      } else {
        throw new Error(result.error || 'Video generation failed');
      }
    } catch (error) {
      console.error(`Error generating segment ${segment.segment_number}:`, error);
      
      // Update video record with error
      await db.query(
        `UPDATE generated_videos 
         SET status = $1, error_message = $2, updated_at = NOW()
         WHERE id = $3`,
        ['failed', error instanceof Error ? error.message : 'Generation failed', videoId]
      );
    }
  }

  private async generateAudioInBackground(projectId: string, audioStrategy: any, jobId: string): Promise<void> {
    try {
      console.log(`Generating audio for project ${projectId}`);
      
      if (audioStrategy.voice_requirements) {
        const voiceRequest: ElevenLabsVoiceRequest = {
          text: audioStrategy.voice_requirements,
          stability: 0.7,
          similarity: 0.8,
          style: 0.5
        };
        
        const voiceResult = await elevenLabsService.generateVoice(voiceRequest);
        
        if (voiceResult.audioUrl) {
          // Save audio to project
          await db.query(
            'UPDATE projects SET audio_file_url = $1 WHERE id = $2',
            [voiceResult.audioUrl, projectId]
          );
          
          console.log(`Audio generated successfully for project ${projectId}`);
        } else {
          throw new Error(voiceResult.error || 'Audio generation failed');
        }
      }
    } catch (error) {
      console.error(`Error generating audio for project ${projectId}:`, error);
    }
  }

  async getJobProgress(jobId: string): Promise<any> {
    try {
      // Get job status
      const jobResult = await db.query(
        'SELECT status, progress, error_message FROM processing_jobs WHERE id = $1',
        [jobId]
      );
      
      if (jobResult.rows.length === 0) {
        return { success: false, error: 'Job not found' };
      }

      const job = jobResult.rows[0];
      
      // Get associated videos progress
      const videosResult = await db.query(
        `SELECT status, COUNT(*) as count 
         FROM generated_videos 
         WHERE project_id = (SELECT project_id FROM processing_jobs WHERE id = $1)
         GROUP BY status`,
        [jobId]
      );
      
      const videoProgress = videosResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {} as { [key: string]: number });
      
      return {
        success: true,
        job_status: job.status,
        progress: job.progress,
        error: job.error_message,
        video_progress: videoProgress
      };
    } catch (error) {
      console.error('Error getting job progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get progress'
      };
    }
  }

  private calculateEstimatedTime(segmentCount: number): string {
    // Rough estimation based on segment count and AI model processing times
    const avgTimePerSegment = 120; // 2 minutes per segment
    const totalMinutes = segmentCount * avgTimePerSegment;
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }
}

export const videoGenerationService = new VideoGenerationService();
export type { VideoSegment, VideoGenerationPlan, VideoGenerationResult };