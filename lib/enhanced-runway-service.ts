// Enhanced RunwayML Service with Rate Limiting
import { rateLimitService } from './rate-limit-service';

interface RunwayGenerationRequest {
  prompt: string;
  imageUrl?: string;
  model: 'gen4_turbo' | 'gen3_alpha';
  duration: number;
  aspectRatio: string;
}

interface RunwayGenerationResponse {
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

class EnhancedRunwayService {
  private baseUrl: string = 'https://api.runwayml.com';

  async generateVideo(request: RunwayGenerationRequest): Promise<RunwayGenerationResponse> {
    try {
      return await rateLimitService.executeWithRateLimit('runway', async (apiKey) => {
        if (!apiKey) {
          throw new Error('RUNWAY_API_KEY is required');
        }

        const payload = {
          model: request.model,
          prompt_text: request.prompt,
          ...(request.imageUrl && { prompt_image: request.imageUrl }),
          duration: Math.min(request.duration, request.model === 'gen4_turbo' ? 10 : 4),
          ratio: request.aspectRatio === '9:16' ? '720:1280' : '1280:720',
          seed: Math.floor(Math.random() * 1000000)
        };

        console.log('Enhanced RunwayML request:', payload);

        const endpoint = request.imageUrl ? '/image_to_video' : '/text_to_video';
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('RunwayML API error:', error);
          throw new Error(`RunwayML API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        console.log('Enhanced RunwayML response:', data);
        
        return {
          taskId: data.id || data.task_id,
          status: data.status || 'processing',
          videoUrl: data.output?.[0] || data.video_url,
          error: data.error
        };
      }, 'high');
    } catch (error) {
      console.error('Enhanced RunwayML generation error:', error);
      throw error;
    }
  }

  async getTaskStatus(taskId: string): Promise<RunwayGenerationResponse> {
    try {
      return await rateLimitService.executeWithRateLimit('runway', async (apiKey) => {
        const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`RunwayML API error: ${response.status}`);
        }

        const data = await response.json();
        
        return {
          taskId: data.id,
          status: data.status,
          videoUrl: data.output?.[0],
          error: data.error
        };
      }, 'medium');
    } catch (error) {
      console.error('Enhanced RunwayML status check error:', error);
      throw error;
    }
  }

  async waitForCompletion(taskId: string, maxWaitTime: number = 300000): Promise<RunwayGenerationResponse> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getTaskStatus(taskId);
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Video generation timed out');
  }
}

export const enhancedRunwayService = new EnhancedRunwayService();
export type { RunwayGenerationRequest, RunwayGenerationResponse };