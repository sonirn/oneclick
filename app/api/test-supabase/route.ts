import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test Supabase connection by checking auth status
    const { data: { session } } = await supabase.auth.getSession()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase connection successful',
      connected: true,
      hasSession: !!session
    })
  } catch (error) {
    console.error('Supabase test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Supabase connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}