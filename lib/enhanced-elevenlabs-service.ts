// Enhanced ElevenLabs Service with Rate Limiting
import { rateLimitService } from './rate-limit-service';

interface ElevenLabsVoiceRequest {
  text: string;
  voiceId?: string;
  model?: string;
  stability?: number;
  similarity?: number;
  style?: number;
  speakerBoost?: boolean;
}

interface ElevenLabsVoiceResponse {
  audioId: string;
  audioUrl?: string;
  duration?: number;
  error?: string;
}

interface VoiceCloneRequest {
  name: string;
  description?: string;
  files: File[];
}

interface VoiceCloneResponse {
  voiceId: string;
  name: string;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
}

class EnhancedElevenLabsService {
  private baseUrl: string = 'https://api.elevenlabs.io/v1';

  async generateVoice(request: ElevenLabsVoiceRequest): Promise<ElevenLabsVoiceResponse> {
    try {
      return await rateLimitService.executeWithRateLimit('elevenlabs', async (apiKey) => {
        if (!apiKey) {
          throw new Error('ELEVENLABS_API_KEY is required');
        }

        const voiceId = request.voiceId || 'EXAVITQu4vr4jVoFBE7fJyWN';
        const payload = {
          text: request.text,
          model_id: request.model || 'eleven_multilingual_v2',
          voice_settings: {
            stability: request.stability || 0.5,
            similarity_boost: request.similarity || 0.5,
            style: request.style || 0,
            use_speaker_boost: request.speakerBoost || false
          }
        };

        console.log('Enhanced ElevenLabs request:', { voiceId, payload });

        const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('ElevenLabs API error:', error);
          throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Convert to base64 for storage and frontend compatibility
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

        console.log('Enhanced ElevenLabs response: Audio generated successfully');

        return {
          audioId,
          audioUrl: audioDataUrl,
          duration: await this.estimateAudioDuration(audioBuffer)
        };
      }, 'high');
    } catch (error) {
      console.error('Enhanced ElevenLabs voice generation error:', error);
      return {
        audioId: `error_${Date.now()}`,
        error: error instanceof Error ? error.message : 'Voice generation failed'
      };
    }
  }

  async cloneVoice(request: VoiceCloneRequest): Promise<VoiceCloneResponse> {
    try {
      return await rateLimitService.executeWithRateLimit('elevenlabs', async (apiKey) => {
        const formData = new FormData();
        formData.append('name', request.name);
        if (request.description) {
          formData.append('description', request.description);
        }

        // Add voice sample files
        request.files.forEach((file, index) => {
          formData.append(`files[${index}]`, file);
        });

        const response = await fetch(`${this.baseUrl}/voices/add`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        
        return {
          voiceId: data.voice_id,
          name: data.name,
          status: 'completed'
        };
      }, 'medium');
    } catch (error) {
      console.error('Enhanced ElevenLabs voice cloning error:', error);
      return {
        voiceId: `error_${Date.now()}`,
        name: request.name,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Voice cloning failed'
      };
    }
  }

  async getVoices(): Promise<any[]> {
    try {
      return await rateLimitService.executeWithRateLimit('elevenlabs', async (apiKey) => {
        const response = await fetch(`${this.baseUrl}/voices`, {
          headers: {
            'xi-api-key': apiKey,
          },
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const data = await response.json();
        return data.voices || [];
      }, 'low');
    } catch (error) {
      console.error('Enhanced ElevenLabs get voices error:', error);
      return [];
    }
  }

  async processAudioForVideo(audioBlob: Blob, videoDuration: number): Promise<Blob> {
    try {
      const audioDuration = await this.getAudioDuration(audioBlob);
      
      if (Math.abs(audioDuration - videoDuration) < 0.5) {
        return audioBlob;
      }

      // For now, just return the original audio
      return audioBlob;
    } catch (error) {
      console.error('Audio processing error:', error);
      throw error;
    }
  }

  private async estimateAudioDuration(audioBuffer: ArrayBuffer): Promise<number> {
    const sizeInBytes = audioBuffer.byteLength;
    const estimatedDuration = sizeInBytes / 16000; // Rough estimation
    return Math.max(1, estimatedDuration);
  }

  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        resolve(5); // Default 5 seconds on error
      });
      audio.src = URL.createObjectURL(audioBlob);
    });
  }
}

export const enhancedElevenLabsService = new EnhancedElevenLabsService();
export type { ElevenLabsVoiceRequest, ElevenLabsVoiceResponse, VoiceCloneRequest, VoiceCloneResponse };