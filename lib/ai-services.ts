import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// AI Video Analysis Service
export const videoAnalysisService = {
  // Analyze video content and generate detailed analysis
  analyzeVideo: async (videoUrl: string, characterImageUrl?: string, audioFileUrl?: string) => {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
      
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
    "colors": "description",
    "lighting": "description", 
    "composition": "description",
    "camera_work": "description"
  },
  "content_analysis": {
    "type": "content type",
    "theme": "main theme",
    "target_audience": "audience description",
    "mood": "overall mood"
  },
  "technical_details": {
    "pacing": "fast/medium/slow",
    "scene_count": "estimated number",
    "transition_style": "description",
    "effects_used": ["list of effects"]
  },
  "script_elements": {
    "has_text_overlay": true,
    "has_narration": true,
    "key_messages": ["list of key messages"],
    "call_to_action": "CTA if any"
  },
  "generation_requirements": {
    "aspect_ratio": "9:16",
    "duration": "target duration in seconds",
    "complexity": "simple/medium/complex",
    "recommended_ai_models": ["list of suitable AI models"]
  }
}

Video URL: ${videoUrl}
${characterImageUrl ? `Character Image: ${characterImageUrl}` : ''}
${audioFileUrl ? `Audio File: ${audioFileUrl}` : ''}
`

      const result = await model.generateContent([
        {
          text: `You are an expert video analyst specializing in content analysis for AI video generation. Analyze videos in detail and provide structured insights for recreating similar content.\n\n${analysisPrompt}`
        }
      ])

      const analysisText = result.response.text()
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
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
      
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
  "plan_summary": "Overall plan description",
  "total_duration": 30,
  "segments": [
    {
      "segment_number": 1,
      "duration": 10,
      "description": "what happens in this segment",
      "visual_style": "visual requirements",
      "ai_model": "runway-gen4",
      "prompt": "AI generation prompt for this segment",
      "text_overlay": "text to display if any",
      "audio_notes": "audio requirements for this segment"
    }
  ],
  "transitions": [
    {
      "between_segments": "1-2",
      "type": "cut/fade/effect",
      "description": "transition description"
    }
  ],
  "audio_strategy": {
    "type": "custom/generated/effects",
    "description": "audio approach",
    "voice_requirements": "if narration needed",
    "background_music": "requirements",
    "sound_effects": ["list of needed effects"]
  },
  "post_production": {
    "color_grading": "requirements",
    "effects": ["list of effects"],
    "text_animations": "requirements",
    "final_touches": "additional requirements"
  },
  "estimated_time": "total generation time estimate",
  "complexity_score": 7
}
`

      const result = await model.generateContent([
        {
          text: `You are an expert video production planner specializing in AI-generated content. Create detailed, actionable plans for video generation using multiple AI models.\n\n${planPrompt}`
        }
      ])

      const planText = result.response.text()
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
        return {
          success: true,
          plan: {
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
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
      
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

      const result = await model.generateContent([
        {
          text: `You are an expert video production assistant helping users refine their AI video generation plans. Be conversational, helpful, and technical when needed.\n\n${chatPrompt}`
        }
      ])

      const response = result.response.text()
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
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
      
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

      const result = await model.generateContent([
        {
          text: `You are a plan update extractor. Identify and extract plan modifications from chat responses.\n\n${extractPrompt}`
        }
      ])

      const updateText = result.response.text()
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