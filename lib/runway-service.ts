// RunwayML Gen-4 Turbo and Gen-3 Alpha Integration
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

class RunwayService {
  private apiKey: string;
  private baseUrl: string = 'https://api.runwayml.com/v1';

  constructor() {
    this.apiKey = process.env.RUNWAY_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('RUNWAY_API_KEY environment variable is required');
    }
  }

  async generateVideo(request: RunwayGenerationRequest): Promise<RunwayGenerationResponse> {
    try {
      // Real RunwayML API integration
      const payload = {
        model: request.model === 'gen4_turbo' ? 'gen4-turbo' : 'gen3-alpha',
        prompt: request.prompt,
        ...(request.imageUrl && { image: request.imageUrl }),
        duration: Math.min(request.duration, request.model === 'gen4_turbo' ? 10 : 4), // Gen4: 10s max, Gen3: 4s max
        ratio: request.aspectRatio === '9:16' ? '720:1280' : '1280:720',
        seed: Math.floor(Math.random() * 1000000)
      };

      console.log('RunwayML request:', payload);

      const response = await fetch(`${this.baseUrl}/video/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
      console.log('RunwayML response:', data);
      
      return {
        taskId: data.id || data.task_id,
        status: data.status || 'processing',
        videoUrl: data.output?.[0] || data.video_url,
        error: data.error
      };
    } catch (error) {
      console.error('RunwayML generation error:', error);
      throw error;
    }
  }

  async getTaskStatus(taskId: string): Promise<RunwayGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
    } catch (error) {
      console.error('RunwayML status check error:', error);
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

export const runwayService = new RunwayService();
export type { RunwayGenerationRequest, RunwayGenerationResponse };