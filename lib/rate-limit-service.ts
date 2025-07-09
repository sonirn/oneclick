// Advanced Rate Limiting Service with Multiple API Keys
import { GoogleGenerativeAI } from '@google/generative-ai';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  cooldownMs: number;
  retryAttempts: number;
  backoffMultiplier: number;
}

interface ApiKeyInfo {
  key: string;
  lastUsed: number;
  requestCount: number;
  isBlocked: boolean;
  nextAvailableTime: number;
}

interface ServiceConfig {
  name: string;
  apiKeys: string[];
  rateLimitConfig: RateLimitConfig;
  currentKeyIndex: number;
  keyInfo: Map<string, ApiKeyInfo>;
}

class RateLimitService {
  private services: Map<string, ServiceConfig> = new Map();
  private requestQueue: Map<string, Array<() => Promise<any>>> = new Map();
  private processingQueue: Map<string, boolean> = new Map();

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    // Gemini API Keys (Multiple keys for load balancing)
    const geminiKeys = [
      'AIzaSyBwVEDRvZ2bHppZj2zN4opMqxjzcxpJCDk',
      'AIzaSyB-VMWQe_Bvx6j_iixXTVGRB0fx0RpQSLU',
      'AIzaSyD36dRBkEZUyCpDHLxTVuMO4P98SsYjkbc'
    ];

    // Initialize Gemini service with multiple keys
    this.services.set('gemini', {
      name: 'Gemini',
      apiKeys: geminiKeys,
      rateLimitConfig: {
        maxRequests: 15, // Conservative limit per key per minute
        windowMs: 60000, // 1 minute
        cooldownMs: 30000, // 30 seconds cooldown after rate limit
        retryAttempts: 3,
        backoffMultiplier: 2
      },
      currentKeyIndex: 0,
      keyInfo: new Map()
    });

    // Initialize other services
    this.services.set('runway', {
      name: 'RunwayML',
      apiKeys: [process.env.RUNWAY_API_KEY || ''],
      rateLimitConfig: {
        maxRequests: 10,
        windowMs: 60000,
        cooldownMs: 60000,
        retryAttempts: 3,
        backoffMultiplier: 2
      },
      currentKeyIndex: 0,
      keyInfo: new Map()
    });

    this.services.set('elevenlabs', {
      name: 'ElevenLabs',
      apiKeys: [process.env.ELEVENLABS_API_KEY || ''],
      rateLimitConfig: {
        maxRequests: 20,
        windowMs: 60000,
        cooldownMs: 30000,
        retryAttempts: 3,
        backoffMultiplier: 2
      },
      currentKeyIndex: 0,
      keyInfo: new Map()
    });

    this.services.set('groq', {
      name: 'Groq',
      apiKeys: [process.env.GROQ_API_KEY || ''],
      rateLimitConfig: {
        maxRequests: 30,
        windowMs: 60000,
        cooldownMs: 20000,
        retryAttempts: 3,
        backoffMultiplier: 2
      },
      currentKeyIndex: 0,
      keyInfo: new Map()
    });

    // Initialize key info for all services
    for (const [serviceName, service] of this.services) {
      service.apiKeys.forEach(key => {
        if (key) {
          service.keyInfo.set(key, {
            key,
            lastUsed: 0,
            requestCount: 0,
            isBlocked: false,
            nextAvailableTime: 0
          });
        }
      });
      this.requestQueue.set(serviceName, []);
      this.processingQueue.set(serviceName, false);
    }
  }

  // Get the best available API key for a service
  private getBestApiKey(serviceName: string): string | null {
    const service = this.services.get(serviceName);
    if (!service) return null;

    const now = Date.now();
    const validKeys = service.apiKeys.filter(key => key && key.length > 0);
    
    if (validKeys.length === 0) return null;

    // Find the best available key
    let bestKey: string | null = null;
    let bestScore = -1;

    for (const key of validKeys) {
      const keyInfo = service.keyInfo.get(key);
      if (!keyInfo) continue;

      // Skip blocked keys that haven't recovered
      if (keyInfo.isBlocked && now < keyInfo.nextAvailableTime) {
        continue;
      }

      // Reset blocked status if cooldown period has passed
      if (keyInfo.isBlocked && now >= keyInfo.nextAvailableTime) {
        keyInfo.isBlocked = false;
        keyInfo.requestCount = 0;
      }

      // Calculate score based on usage and timing
      const timeSinceLastUse = now - keyInfo.lastUsed;
      const requestCountScore = service.rateLimitConfig.maxRequests - keyInfo.requestCount;
      const timeScore = Math.min(timeSinceLastUse / 1000, 60); // Max 60 seconds bonus
      const totalScore = requestCountScore + timeScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestKey = key;
      }
    }

    return bestKey;
  }

  // Update key usage statistics
  private updateKeyUsage(serviceName: string, apiKey: string, success: boolean) {
    const service = this.services.get(serviceName);
    if (!service) return;

    const keyInfo = service.keyInfo.get(apiKey);
    if (!keyInfo) return;

    const now = Date.now();
    keyInfo.lastUsed = now;

    if (success) {
      keyInfo.requestCount++;
      
      // Check if we're approaching rate limit
      if (keyInfo.requestCount >= service.rateLimitConfig.maxRequests) {
        keyInfo.isBlocked = true;
        keyInfo.nextAvailableTime = now + service.rateLimitConfig.cooldownMs;
        console.log(`API key blocked for ${serviceName} until ${new Date(keyInfo.nextAvailableTime).toISOString()}`);
      }
    } else {
      // On failure, assume rate limit hit
      keyInfo.isBlocked = true;
      keyInfo.nextAvailableTime = now + service.rateLimitConfig.cooldownMs;
      console.log(`API key blocked due to error for ${serviceName}`);
    }

    // Reset counters after window period
    setTimeout(() => {
      keyInfo.requestCount = Math.max(0, keyInfo.requestCount - 1);
    }, service.rateLimitConfig.windowMs);
  }

  // Execute request with rate limiting
  async executeWithRateLimit<T>(
    serviceName: string,
    requestFunction: (apiKey: string) => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    return new Promise((resolve, reject) => {
      const requestWrapper = async () => {
        try {
          const result = await this.executeRequestWithRetry(serviceName, requestFunction);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Add to queue based on priority
      const queue = this.requestQueue.get(serviceName)!;
      if (priority === 'high') {
        queue.unshift(requestWrapper);
      } else {
        queue.push(requestWrapper);
      }

      // Process queue
      this.processQueue(serviceName);
    });
  }

  private async executeRequestWithRetry<T>(
    serviceName: string,
    requestFunction: (apiKey: string) => Promise<T>
  ): Promise<T> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < service.rateLimitConfig.retryAttempts; attempt++) {
      const apiKey = this.getBestApiKey(serviceName);
      
      if (!apiKey) {
        const delay = Math.min(
          service.rateLimitConfig.cooldownMs * Math.pow(service.rateLimitConfig.backoffMultiplier, attempt),
          300000 // Max 5 minutes
        );
        
        console.log(`No available API keys for ${serviceName}, waiting ${delay}ms...`);
        await this.sleep(delay);
        continue;
      }

      try {
        const result = await requestFunction(apiKey);
        this.updateKeyUsage(serviceName, apiKey, true);
        return result;
      } catch (error: any) {
        lastError = error;
        this.updateKeyUsage(serviceName, apiKey, false);
        
        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          const delay = Math.min(
            service.rateLimitConfig.cooldownMs * Math.pow(service.rateLimitConfig.backoffMultiplier, attempt),
            300000
          );
          console.log(`Rate limit error for ${serviceName}, retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        } else {
          // For non-rate-limit errors, throw immediately
          throw error;
        }
      }
    }

    throw lastError || new Error(`Max retry attempts exceeded for ${serviceName}`);
  }

  private async processQueue(serviceName: string) {
    if (this.processingQueue.get(serviceName)) {
      return; // Already processing
    }

    this.processingQueue.set(serviceName, true);
    const queue = this.requestQueue.get(serviceName)!;

    while (queue.length > 0) {
      const request = queue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error(`Queue processing error for ${serviceName}:`, error);
        }
        
        // Small delay between requests to prevent overwhelming
        await this.sleep(100);
      }
    }

    this.processingQueue.set(serviceName, false);
  }

  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || error.status || 0;
    
    return (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('too many requests') ||
      errorCode === 429 ||
      errorCode === 503
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get service status for monitoring
  getServiceStatus(serviceName: string): any {
    const service = this.services.get(serviceName);
    if (!service) return null;

    const keyStatuses = Array.from(service.keyInfo.entries()).map(([key, info]) => ({
      key: key.substring(0, 10) + '...',
      lastUsed: new Date(info.lastUsed).toISOString(),
      requestCount: info.requestCount,
      isBlocked: info.isBlocked,
      nextAvailable: info.nextAvailableTime > Date.now() ? new Date(info.nextAvailableTime).toISOString() : null
    }));

    return {
      serviceName,
      totalKeys: service.apiKeys.length,
      availableKeys: Array.from(service.keyInfo.values()).filter(info => !info.isBlocked || Date.now() >= info.nextAvailableTime).length,
      queueLength: this.requestQueue.get(serviceName)?.length || 0,
      keyStatuses
    };
  }

  // Get overall system status
  getSystemStatus(): any {
    const services = Array.from(this.services.keys());
    return {
      timestamp: new Date().toISOString(),
      services: services.map(name => this.getServiceStatus(name))
    };
  }
}

export const rateLimitService = new RateLimitService();
export type { RateLimitConfig, ApiKeyInfo, ServiceConfig };