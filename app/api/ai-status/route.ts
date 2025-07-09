import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const status = {
    overall: 'healthy',
    ai_services: {
      gemini: { status: 'unknown', message: '' },
      runway: { status: 'unknown', message: '' },
      elevenlabs: { status: 'unknown', message: '' }
    },
    timestamp: new Date().toISOString()
  }

  // Test Gemini API
  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`)
    
    if (geminiResponse.ok) {
      status.ai_services.gemini = {
        status: 'healthy',
        message: 'Gemini API connection successful'
      }
    } else {
      status.ai_services.gemini = {
        status: 'unhealthy',
        message: `Gemini API error: ${geminiResponse.status}`
      }
      status.overall = 'degraded'
    }
  } catch (error) {
    status.ai_services.gemini = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Gemini API connection failed'
    }
    status.overall = 'degraded'
  }

  // Test RunwayML API
  try {
    const runwayResponse = await fetch('https://api.runwayml.com/text_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gen3_alpha',
        prompt_text: 'test',
        duration: 3
      })
    })
    
    if (runwayResponse.ok || runwayResponse.status === 400) { // 400 might be expected for test request
      status.ai_services.runway = {
        status: 'healthy',
        message: 'RunwayML API connection successful'
      }
    } else {
      status.ai_services.runway = {
        status: 'unhealthy',
        message: `RunwayML API error: ${runwayResponse.status}`
      }
      status.overall = 'degraded'
    }
  } catch (error) {
    status.ai_services.runway = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'RunwayML API connection failed'
    }
    status.overall = 'degraded'
  }

  // Test ElevenLabs API
  try {
    const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json'
      }
    })
    
    if (elevenlabsResponse.ok) {
      status.ai_services.elevenlabs = {
        status: 'healthy',
        message: 'ElevenLabs API connection successful'
      }
    } else {
      status.ai_services.elevenlabs = {
        status: 'unhealthy',
        message: `ElevenLabs API error: ${elevenlabsResponse.status}`
      }
      status.overall = 'degraded'
    }
  } catch (error) {
    status.ai_services.elevenlabs = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'ElevenLabs API connection failed'
    }
    status.overall = 'degraded'
  }

  return NextResponse.json(status)
}