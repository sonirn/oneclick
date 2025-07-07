import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('_supabase_sessions').select('*').limit(1)
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase connection failed',
        details: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase connection successful',
      connected: true
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