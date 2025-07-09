import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { r2Storage } from '@/lib/cloudflare-r2'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const status = {
    overall: 'healthy',
    services: {
      database: { status: 'unknown', message: '' },
      r2Storage: { status: 'unknown', message: '' },
      supabase: { status: 'unknown', message: '' }
    },
    timestamp: new Date().toISOString()
  }

  // Test Database
  try {
    const dbResult = await db.query('SELECT NOW() as timestamp')
    status.services.database = {
      status: 'healthy',
      message: 'Database connection successful'
    }
  } catch (error) {
    status.services.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed'
    }
    status.overall = 'degraded'
  }

  // Test R2 Storage
  try {
    const r2Result = await r2Storage.getSignedUploadUrl('test-file.txt', 'text/plain')
    status.services.r2Storage = {
      status: r2Result.success ? 'healthy' : 'unhealthy',
      message: r2Result.success ? 'R2 storage connection successful' : (r2Result.error || 'R2 storage connection failed')
    }
    if (!r2Result.success) {
      status.overall = 'degraded'
    }
  } catch (error) {
    status.services.r2Storage = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'R2 storage connection failed'
    }
    status.overall = 'degraded'
  }

  // Test Supabase
  try {
    const { data: { session } } = await supabase.auth.getSession()
    status.services.supabase = {
      status: 'healthy',
      message: 'Supabase connection successful'
    }
  } catch (error) {
    status.services.supabase = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Supabase connection failed'
    }
    status.overall = 'degraded'
  }

  return NextResponse.json(status)
}