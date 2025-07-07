import { NextRequest, NextResponse } from 'next/server'
import { db, initDatabase } from '@/lib/database'

export async function GET() {
  try {
    // Initialize database if not already done
    await initDatabase()
    
    // Test database connection
    const result = await db.query('SELECT NOW() as timestamp')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      timestamp: result.rows[0].timestamp
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}