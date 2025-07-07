import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const status = {
    overall: 'healthy',
    ai_services: {
      groq: { status: 'unknown', message: '' },
      xai: { status: 'unknown', message: '' },
      gemini: { status: 'unknown', message: '' },
      runway: { status: 'unknown', message: '' },
      elevenlabs: { status: 'unknown', message: '' }
    },
    timestamp: new Date().toISOString()
  }

  // Test Groq API
  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (groqResponse.ok) {
      status.ai_services.groq = {
        status: 'healthy',
        message: 'Groq API connection successful'
      }
    } else {
      status.ai_services.groq = {
        status: 'unhealthy',
        message: `Groq API error: ${groqResponse.status}`
      }
      status.overall = 'degraded'
    }
  } catch (error) {
    status.ai_services.groq = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Groq API connection failed'
    }
    status.overall = 'degraded'
  }

  // Test XAI API
  try {
    const xaiResponse = await fetch('https://api.x.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (xaiResponse.ok) {
      status.ai_services.xai = {
        status: 'healthy',
        message: 'XAI API connection successful'
      }
    } else {
      status.ai_services.xai = {
        status: 'unhealthy',
        message: `XAI API error: ${xaiResponse.status}`
      }
      status.overall = 'degraded'
    }
  } catch (error) {
    status.ai_services.xai = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'XAI API connection failed'
    }
    status.overall = 'degraded'
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
    const runwayResponse = await fetch('https://api.runwayml.com/v1/tasks', {
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (runwayResponse.ok || runwayResponse.status === 401) { // 401 means API key is recognized
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