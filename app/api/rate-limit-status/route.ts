// Rate Limit Status API Endpoint
import { NextResponse } from 'next/server';
import { rateLimitService } from '@/lib/rate-limit-service';

export async function GET() {
  try {
    const systemStatus = rateLimitService.getSystemStatus();
    
    return NextResponse.json({
      success: true,
      data: systemStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rate limit status error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rate limit status'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { serviceName } = await request.json();
    
    if (!serviceName) {
      return NextResponse.json({
        success: false,
        error: 'Service name is required'
      }, { status: 400 });
    }
    
    const serviceStatus = rateLimitService.getServiceStatus(serviceName);
    
    if (!serviceStatus) {
      return NextResponse.json({
        success: false,
        error: 'Service not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: serviceStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rate limit service status error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get service status'
    }, { status: 500 });
  }
}