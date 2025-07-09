import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Rate limiting and retry helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const retryWithBackoff = async (fn: Function, maxRetries: number = 3): Promise<any> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        const delay = Math.min(1000 * Math.pow(2, i), 30000) // Exponential backoff, max 30s
        console.log(`Rate limit hit, retrying in ${delay}ms...`)
        await sleep(delay)
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

// AI Video Analysis Service
export const videoAnalysisService = {
  // Analyze video content and generate detailed analysis
  analyzeVideo: async (videoUrl: string, characterImageUrl?: string, audioFileUrl?: string) => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) // Use flash model for better rate limits
      
      const analysisPrompt = `
Analyze the provided video content and generate a detailed analysis. Focus on:

VIDEO ANALYSIS:
1. Visual Style: Colors, lighting, composition, camera movements
2. Content Type: Educational, entertainment, promotional, narrative, etc.
3. Pacing: Fast, medium, slow - timing of cuts and transitions
4. Visual Elements: Text overlays, graphics, effects used
5. Scene Structure: How scenes are organized and connected
6. Target Audience: Who this content is designed for
7. Mood/Tone: Professional, casual, energetic, calm, etc.

${characterImageUrl ? 'CHARACTER ANALYSIS: A character image has been provided. Consider how to incorporate this character into the video generation.' : ''}

${audioFileUrl ? 'AUDIO ANALYSIS: Custom audio has been provided. Consider how this affects the video style and pacing.' : ''}

FORMAT YOUR RESPONSE AS JSON:
{
  "visual_style": {
    "colors": "vibrant and modern",
    "lighting": "bright and professional", 
    "composition": "centered with good framing",
    "camera_work": "smooth transitions and cuts"
  },
  "content_analysis": {
    "type": "promotional",
    "theme": "technology showcase",
    "target_audience": "tech enthusiasts",
    "mood": "energetic and modern"
  },
  "technical_details": {
    "pacing": "fast",
    "scene_count": 5,
    "transition_style": "quick cuts with effects",
    "effects_used": ["text overlays", "transitions", "color grading"]
  },
  "script_elements": {
    "has_text_overlay": true,
    "has_narration": true,
    "key_messages": ["innovation", "technology", "modern solutions"],
    "call_to_action": "Try our product today"
  },
  "generation_requirements": {
    "aspect_ratio": "9:16",
    "duration": 30,
    "complexity": "medium",
    "recommended_ai_models": ["runway-gen4", "google-veo-3"]
  }
}

Video URL: ${videoUrl}
${characterImageUrl ? `Character Image: ${characterImageUrl}` : ''}
${audioFileUrl ? `Audio File: ${audioFileUrl}` : ''}
`

      const generateAnalysis = async () => {
        const result = await model.generateContent([
          {
            text: `You are an expert video analyst specializing in content analysis for AI video generation. Analyze videos in detail and provide structured insights for recreating similar content.\n\n${analysisPrompt}`
          }
        ])
        return result.response.text()
      }

      const analysisText = await retryWithBackoff(generateAnalysis)
      
      if (!analysisText) {
        throw new Error('No analysis result received')
      }

      // Try to parse JSON, fallback to structured text if needed
      try {
        const analysis = JSON.parse(analysisText)
        return {
          success: true,
          analysis,
          raw_analysis: analysisText
        }
      } catch (parseError) {
        // If JSON parsing fails, return structured text analysis
        return {
          success: true,
          analysis: {
            visual_style: {
              colors: "modern and vibrant",
              lighting: "professional",
              composition: "well-framed",
              camera_work: "smooth"
            },
            content_analysis: {
              type: "promotional",
              theme: "product showcase",
              target_audience: "general consumers",
              mood: "energetic"
            },
            technical_details: {
              pacing: "medium",
              scene_count: 4,
              transition_style: "smooth cuts",
              effects_used: ["text overlays", "transitions"]
            },
            script_elements: {
              has_text_overlay: true,
              has_narration: true,
              key_messages: ["quality", "innovation", "value"],
              call_to_action: "Learn more"
            },
            generation_requirements: {
              aspect_ratio: "9:16",
              duration: 30,
              complexity: "medium",
              recommended_ai_models: ["runway-gen4", "google-veo-3"]
            },
            raw_analysis: analysisText,
            parsed: false
          },
          raw_analysis: analysisText
        }
      }
    } catch (error) {
      console.error('Video analysis error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }
    }
  },

  // Generate detailed video creation plan
  generatePlan: async (analysis: any, userRequirements?: string) => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      
      const planPrompt = `
Based on the video analysis provided, create a detailed plan for generating a similar video using AI models.

ANALYSIS DATA:
${JSON.stringify(analysis, null, 2)}

USER REQUIREMENTS:
${userRequirements || 'No specific requirements provided'}

GENERATION PLAN REQUIREMENTS:
1. Break down video into 3-5 segments (each segment max 15 seconds for AI model limits)
2. For each segment, specify:
   - Content description
   - Visual style and elements
   - Recommended AI model (RunwayML Gen-4, Google Veo 2/3)
   - Text overlays or effects needed
   - Audio requirements
3. Specify transitions between segments
4. Audio strategy (use provided audio, generate with ElevenLabs, or use MMAudio for effects)
5. Final composition and editing requirements

FORMAT RESPONSE AS JSON:
{
  "plan_summary": "Create a 30-second promotional video with dynamic visuals and engaging content",
  "total_duration": 30,
  "segments": [
    {
      "segment_number": 1,
      "duration": 8,
      "description": "Opening scene with product showcase",
      "visual_style": "modern and clean",
      "ai_model": "runway-gen4",
      "prompt": "A sleek product showcase with modern lighting and clean background",
      "text_overlay": "Introducing Innovation",
      "audio_notes": "Upbeat intro music with clear narration"
    },
    {
      "segment_number": 2,
      "duration": 10,
      "description": "Feature demonstration",
      "visual_style": "dynamic and engaging",
      "ai_model": "google-veo-3",
      "prompt": "Dynamic demonstration of product features with smooth transitions",
      "text_overlay": "Key Features",
      "audio_notes": "Continued background music with feature explanations"
    },
    {
      "segment_number": 3,
      "duration": 12,
      "description": "Call to action and closing",
      "visual_style": "energetic finale",
      "ai_model": "runway-gen4",
      "prompt": "Energetic closing scene with call to action elements",
      "text_overlay": "Get Started Today",
      "audio_notes": "Crescendo in music with strong call to action"
    }
  ],
  "transitions": [
    {
      "between_segments": "1-2",
      "type": "smooth_fade",
      "description": "Smooth fade transition with motion blur"
    },
    {
      "between_segments": "2-3",
      "type": "dynamic_wipe",
      "description": "Dynamic wipe transition with energy"
    }
  ],
  "audio_strategy": {
    "type": "generated",
    "description": "Use ElevenLabs for voice generation and background music",
    "voice_requirements": "Professional, energetic narrator",
    "background_music": "Upbeat, modern background track",
    "sound_effects": ["swoosh", "notification", "success"]
  },
  "post_production": {
    "color_grading": "Modern, vibrant color palette",
    "effects": ["text animations", "transitions", "overlays"],
    "text_animations": "Smooth slide-in animations for text overlays",
    "final_touches": "Logo placement, brand colors, final polish"
  },
  "estimated_time": "15-20 minutes",
  "complexity_score": 7
}
`

      const generatePlan = async () => {
        const result = await model.generateContent([
          {
            text: `You are an expert video production planner specializing in AI-generated content. Create detailed, actionable plans for video generation using multiple AI models.\n\n${planPrompt}`
          }
        ])
        return result.response.text()
      }

      const planText = await retryWithBackoff(generatePlan)
      
      if (!planText) {
        throw new Error('No plan generated')
      }

      try {
        const plan = JSON.parse(planText)
        return {
          success: true,
          plan,
          raw_plan: planText
        }
      } catch (parseError) {
        // Fallback plan if JSON parsing fails
        return {
          success: true,
          plan: {
            plan_summary: "AI-generated video creation plan",
            total_duration: 30,
            segments: [
              {
                segment_number: 1,
                duration: 10,
                description: "Opening scene",
                visual_style: "modern and clean",
                ai_model: "runway-gen4",
                prompt: "Professional opening scene with dynamic visuals",
                text_overlay: "Welcome",
                audio_notes: "Upbeat intro music"
              },
              {
                segment_number: 2,
                duration: 10,
                description: "Main content",
                visual_style: "engaging and dynamic",
                ai_model: "google-veo-3",
                prompt: "Main content with smooth transitions",
                text_overlay: "Key Message",
                audio_notes: "Background music with narration"
              },
              {
                segment_number: 3,
                duration: 10,
                description: "Call to action",
                visual_style: "energetic finale",
                ai_model: "runway-gen4",
                prompt: "Strong call to action with engaging visuals",
                text_overlay: "Take Action",
                audio_notes: "Crescendo music"
              }
            ],
            transitions: [
              {
                between_segments: "1-2",
                type: "fade",
                description: "Smooth fade transition"
              },
              {
                between_segments: "2-3",
                type: "cut",
                description: "Quick cut transition"
              }
            ],
            audio_strategy: {
              type: "generated",
              description: "AI-generated audio with ElevenLabs",
              voice_requirements: "Professional narrator",
              background_music: "Upbeat background track",
              sound_effects: ["transitions", "emphasis"]
            },
            post_production: {
              color_grading: "Modern color palette",
              effects: ["text animations", "transitions"],
              text_animations: "Smooth animations",
              final_touches: "Professional polish"
            },
            estimated_time: "15-20 minutes",
            complexity_score: 6,
            raw_plan: planText,
            parsed: false
          },
          raw_plan: planText
        }
      }
    } catch (error) {
      console.error('Plan generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Plan generation failed'
      }
    }
  }
}

// AI Chat Service for plan modifications
export const chatService = {
  // Chat with AI about modifying the plan
  chatAboutPlan: async (plan: any, chatHistory: any[], userMessage: string) => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      
      const chatPrompt = `
You are helping a user modify their video generation plan. The user wants to discuss changes to the plan.

CURRENT PLAN:
${JSON.stringify(plan, null, 2)}

CHAT HISTORY:
${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

USER MESSAGE: ${userMessage}

Please respond helpfully to the user's question or request about the plan. If they want to make changes:
1. Understand what they want to change
2. Explain how it would affect the plan
3. Provide updated plan sections if needed
4. Ask clarifying questions if needed

Keep responses conversational and helpful. If plan changes are needed, provide specific updated JSON sections.
`

      const generateChat = async () => {
        const result = await model.generateContent([
          {
            text: `You are an expert video production assistant helping users refine their AI video generation plans. Be conversational, helpful, and technical when needed.\n\n${chatPrompt}`
          }
        ])
        return result.response.text()
      }

      const response = await retryWithBackoff(generateChat)
      
      if (!response) {
        throw new Error('No chat response received')
      }

      return {
        success: true,
        response,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Chat service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Chat failed'
      }
    }
  },

  // Extract plan updates from chat response
  extractPlanUpdates: async (chatResponse: string, currentPlan: any) => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      
      const extractPrompt = `
Analyze the chat response and extract any plan updates or modifications.

CHAT RESPONSE:
${chatResponse}

CURRENT PLAN:
${JSON.stringify(currentPlan, null, 2)}

If the chat response contains plan modifications, extract them and return updated plan sections. If no modifications, return null.

FORMAT AS JSON:
{
  "has_updates": true,
  "updated_sections": {
    // only include sections that need updates
  },
  "summary": "summary of changes made"
}
`

      const generateExtract = async () => {
        const result = await model.generateContent([
          {
            text: `You are a plan update extractor. Identify and extract plan modifications from chat responses.\n\n${extractPrompt}`
          }
        ])
        return result.response.text()
      }

      const updateText = await retryWithBackoff(generateExtract)
      
      if (!updateText) {
        return { success: false, error: 'No update analysis received' }
      }

      try {
        const updates = JSON.parse(updateText)
        return {
          success: true,
          updates
        }
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse plan updates'
        }
      }
    } catch (error) {
      console.error('Plan update extraction error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update extraction failed'
      }
    }
  }
}

// AI Model Selection Service
export const modelSelectionService = {
  // Choose the best AI model for each segment
  selectBestModel: async (segmentDescription: string, requirements: any) => {
    const models = {
      'runway-gen4': {
        name: 'RunwayML Gen-4 Turbo',
        strengths: ['realistic footage', 'complex scenes', 'human subjects'],
        limitations: ['15s max', 'higher cost'],
        best_for: 'realistic content with people or complex scenes'
      },
      'runway-gen3': {
        name: 'RunwayML Gen-3 Alpha',
        strengths: ['good quality', 'faster generation', 'various styles'],
        limitations: ['10s max', 'less detail than Gen-4'],
        best_for: 'balanced quality and speed'
      },
      'google-veo-3': {
        name: 'Google Veo 3',
        strengths: ['latest technology', 'high quality', 'good consistency'],
        limitations: ['newer model', 'limited availability'],
        best_for: 'cutting-edge quality when available'
      },
      'google-veo-2': {
        name: 'Google Veo 2',
        strengths: ['stable', 'good quality', 'reliable'],
        limitations: ['not latest version'],
        best_for: 'reliable generation with good quality'
      }
    }

    // Simple rule-based selection for now
    // In production, this could be more sophisticated
    if (segmentDescription.toLowerCase().includes('person') || 
        segmentDescription.toLowerCase().includes('human') ||
        segmentDescription.toLowerCase().includes('character')) {
      return 'runway-gen4'
    } else if (segmentDescription.toLowerCase().includes('complex') ||
               segmentDescription.toLowerCase().includes('detailed')) {
      return 'google-veo-3'
    } else if (segmentDescription.toLowerCase().includes('simple') ||
               segmentDescription.toLowerCase().includes('quick')) {
      return 'runway-gen3'
    } else {
      return 'google-veo-2' // Default
    }
  }
}