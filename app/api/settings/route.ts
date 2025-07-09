import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // Get user settings (in production, this would be from a settings table)
    const settingsResult = await db.query(
      'SELECT settings FROM user_settings WHERE user_id = $1',
      [userId]
    )

    let settings = {
      notifications: {
        email: true,
        push: false,
        video_completion: true,
        project_updates: false,
        system_alerts: true
      },
      preferences: {
        default_quality: 'HD',
        auto_download: false,
        retention_days: 7,
        preferred_models: ['RunwayML Gen-4', 'Google Veo 3']
      },
      privacy: {
        data_sharing: false,
        analytics: true,
        public_profile: false
      }
    }

    if (settingsResult.rows.length > 0) {
      settings = { ...settings, ...settingsResult.rows[0].settings }
    }

    return NextResponse.json({ 
      success: true, 
      settings 
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch settings' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, settings } = await request.json()

    if (!userId || !settings) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and settings are required' 
      }, { status: 400 })
    }

    // Save user settings (in production, this would be a proper settings table)
    await db.query(
      `INSERT INTO user_settings (user_id, settings, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (user_id) 
       DO UPDATE SET settings = $2, updated_at = NOW()`,
      [userId, JSON.stringify(settings)]
    )

    return NextResponse.json({ 
      success: true, 
      message: 'Settings saved successfully' 
    })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save settings' 
    }, { status: 500 })
  }
}