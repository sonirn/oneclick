// Video Composition and Editing Service using FFmpeg
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

interface VideoSegment {
  id: string;
  url: string;
  duration: number;
  position: number;
  transition?: {
    type: 'cut' | 'fade' | 'dissolve';
    duration: number;
  };
  textOverlay?: {
    text: string;
    position: 'top' | 'bottom' | 'center';
    duration: number;
    startTime: number;
  };
}

interface AudioTrack {
  url: string;
  volume: number;
  startTime: number;
  duration: number;
  type: 'voice' | 'music' | 'effects';
}

interface CompositionRequest {
  projectId: string;
  segments: VideoSegment[];
  audioTracks: AudioTrack[];
  outputSettings: {
    resolution: string;
    aspectRatio: string;
    fps: number;
    bitrate: string;
    format: string;
  };
  effects?: {
    colorGrading?: {
      brightness: number;
      contrast: number;
      saturation: number;
    };
    filters?: string[];
  };
}

interface CompositionResult {
  success: boolean;
  outputUrl?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

class VideoCompositionService {
  private tempDir: string;
  private outputDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.outputDir = path.join(process.cwd(), 'output');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    await fsPromises.mkdir(this.tempDir, { recursive: true });
    await fsPromises.mkdir(this.outputDir, { recursive: true });
  }

  async composeVideo(request: CompositionRequest): Promise<CompositionResult> {
    const outputPath = path.join(this.outputDir, `${request.projectId}_final.mp4`);
    
    try {
      console.log(`Starting video composition for project ${request.projectId}`);
      
      // Download segments to temporary directory
      const localSegments = await this.downloadSegments(request.segments);
      
      // Create video composition
      const videoResult = await this.createVideoComposition(
        localSegments,
        request.outputSettings,
        request.effects,
        outputPath
      );
      
      if (!videoResult.success) {
        throw new Error(videoResult.error || 'Video composition failed');
      }
      
      // Add audio tracks if present
      if (request.audioTracks.length > 0) {
        const audioResult = await this.addAudioTracks(
          outputPath,
          request.audioTracks,
          request.outputSettings
        );
        
        if (!audioResult.success) {
          throw new Error(audioResult.error || 'Audio composition failed');
        }
      }
      
      // Get file stats
      const stats = await fsPromises.stat(outputPath);
      const duration = await this.getVideoDuration(outputPath);
      
      // Clean up temporary files
      await this.cleanupTempFiles(localSegments);
      
      return {
        success: true,
        outputUrl: outputPath,
        duration,
        fileSize: stats.size
      };
    } catch (error) {
      console.error('Video composition error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Composition failed'
      };
    }
  }

  private async downloadSegments(segments: VideoSegment[]): Promise<VideoSegment[]> {
    const localSegments: VideoSegment[] = [];
    
    for (const segment of segments) {
      const localPath = path.join(this.tempDir, `segment_${segment.id}.mp4`);
      
      try {
        const response = await fetch(segment.url);
        if (!response.ok) {
          throw new Error(`Failed to download segment ${segment.id}`);
        }
        
        const buffer = await response.arrayBuffer();
        await fsPromises.writeFile(localPath, Buffer.from(buffer));
        
        localSegments.push({
          ...segment,
          url: localPath
        });
      } catch (error) {
        console.error(`Error downloading segment ${segment.id}:`, error);
        throw error;
      }
    }
    
    return localSegments;
  }

  private async createVideoComposition(
    segments: VideoSegment[],
    outputSettings: CompositionRequest['outputSettings'],
    outputPath: string,
    effects?: CompositionRequest['effects']
  ): Promise<CompositionResult> {
    return new Promise((resolve) => {
      const command = ffmpeg();
      
      // Add input segments
      segments.forEach(segment => {
        command.input(segment.url);
      });
      
      // Set output options
      command
        .outputOptions([
          '-c:v libx264',
          '-preset medium',
          '-crf 23',
          `-b:v ${outputSettings.bitrate}`,
          `-r ${outputSettings.fps}`,
          `-s ${outputSettings.resolution}`,
          '-pix_fmt yuv420p'
        ]);
      
      // Add color grading if specified
      if (effects?.colorGrading) {
        const { brightness, contrast, saturation } = effects.colorGrading;
        command.videoFilters([
          `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`
        ]);
      }
      
      // Add custom filters if specified
      if (effects?.filters && effects.filters.length > 0) {
        command.videoFilters(effects.filters);
      }
      
      // Create filter complex for transitions and overlays
      const filterComplex = this.buildFilterComplex(segments);
      if (filterComplex) {
        command.complexFilter(filterComplex);
      }
      
      // Set output format
      command.format(outputSettings.format);
      
      // Execute composition
      command
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`Composition progress: ${progress.percent}%`);
        })
        .on('end', () => {
          console.log('Video composition completed');
          resolve({ success: true });
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          resolve({ 
            success: false, 
            error: err.message 
          });
        })
        .run();
    });
  }

  private buildFilterComplex(segments: VideoSegment[]): string | null {
    if (segments.length <= 1) return null;
    
    const filters: string[] = [];
    let currentLabel = '[0:v]';
    
    // Process segments with transitions
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      const nextLabel = i === segments.length - 1 ? '[outv]' : `[v${i}]`;
      
      if (segment.transition?.type === 'fade') {
        filters.push(
          `${currentLabel}[${i}:v]xfade=transition=fade:duration=${segment.transition.duration}:offset=${segment.position}${nextLabel}`
        );
      } else if (segment.transition?.type === 'dissolve') {
        filters.push(
          `${currentLabel}[${i}:v]xfade=transition=dissolve:duration=${segment.transition.duration}:offset=${segment.position}${nextLabel}`
        );
      } else {
        // Simple concatenation
        filters.push(
          `${currentLabel}[${i}:v]concat=n=2:v=1:a=0${nextLabel}`
        );
      }
      
      currentLabel = nextLabel;
    }
    
    // Add text overlays
    segments.forEach((segment, index) => {
      if (segment.textOverlay) {
        const position = this.getTextPosition(segment.textOverlay.position);
        filters.push(
          `[v${index}]drawtext=text='${segment.textOverlay.text}':${position}:enable='between(t,${segment.textOverlay.startTime},${segment.textOverlay.startTime + segment.textOverlay.duration})'[v${index}text]`
        );
      }
    });
    
    return filters.length > 0 ? filters.join(';') : null;
  }

  private getTextPosition(position: string): string {
    switch (position) {
      case 'top':
        return 'x=(w-text_w)/2:y=50:fontsize=24:fontcolor=white';
      case 'bottom':
        return 'x=(w-text_w)/2:y=h-text_h-50:fontsize=24:fontcolor=white';
      case 'center':
        return 'x=(w-text_w)/2:y=(h-text_h)/2:fontsize=24:fontcolor=white';
      default:
        return 'x=(w-text_w)/2:y=h-text_h-50:fontsize=24:fontcolor=white';
    }
  }

  private async addAudioTracks(
    videoPath: string,
    audioTracks: AudioTrack[],
    outputSettings: CompositionRequest['outputSettings']
  ): Promise<CompositionResult> {
    return new Promise((resolve) => {
      const outputPath = videoPath.replace('.mp4', '_with_audio.mp4');
      const command = ffmpeg();
      
      // Add video input
      command.input(videoPath);
      
      // Add audio inputs
      audioTracks.forEach(track => {
        command.input(track.url);
      });
      
      // Build audio filter complex
      const audioFilters = this.buildAudioFilterComplex(audioTracks);
      if (audioFilters) {
        command.complexFilter(audioFilters);
      }
      
      // Set output options
      command
        .outputOptions([
          '-c:v copy', // Copy video without re-encoding
          '-c:a aac',
          '-b:a 128k',
          '-ac 2'
        ])
        .output(outputPath)
        .on('end', () => {
          // Replace original file with audio version
          fs.renameSync(outputPath, videoPath);
          resolve({ success: true });
        })
        .on('error', (err) => {
          resolve({ 
            success: false, 
            error: err.message 
          });
        })
        .run();
    });
  }

  private buildAudioFilterComplex(audioTracks: AudioTrack[]): string | null {
    if (audioTracks.length === 0) return null;
    
    const filters: string[] = [];
    
    // Process each audio track
    audioTracks.forEach((track, index) => {
      const inputIndex = index + 1; // +1 because video is input 0
      
      filters.push(
        `[${inputIndex}:a]volume=${track.volume}:eval=frame,adelay=${track.startTime * 1000}|${track.startTime * 1000}[a${index}]`
      );
    });
    
    // Mix all audio tracks
    const audioInputs = audioTracks.map((_, index) => `[a${index}]`).join('');
    filters.push(
      `${audioInputs}amix=inputs=${audioTracks.length}:duration=longest[aout]`
    );
    
    return filters.join(';');
  }

  private async getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const duration = metadata?.format?.duration || 0;
        resolve(duration);
      });
    });
  }

  private async cleanupTempFiles(segments: VideoSegment[]): Promise<void> {
    for (const segment of segments) {
      try {
        await fsPromises.unlink(segment.url);
      } catch (error) {
        console.error(`Error cleaning up temp file ${segment.url}:`, error);
      }
    }
  }

  // Utility method to validate video file
  async validateVideo(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          resolve(false);
          return;
        }
        
        const hasVideo = metadata?.streams?.some(stream => stream.codec_type === 'video');
        resolve(hasVideo || false);
      });
    });
  }

  // Get video metadata
  async getVideoMetadata(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(metadata);
      });
    });
  }
}

export const videoCompositionService = new VideoCompositionService();
export type { VideoSegment, AudioTrack, CompositionRequest, CompositionResult };