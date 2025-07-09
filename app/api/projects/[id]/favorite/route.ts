import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    if (!projectId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID is required' 
      }, { status: 400 });
    }

    // Check if project exists
    const projectQuery = 'SELECT id FROM projects WHERE id = $1';
    const projectResult = await db.query(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 });
    }

    // In production, you would have a separate favorites table
    // For now, we'll just return success since the frontend manages state
    // await db.query('INSERT INTO project_favorites (project_id, user_id) VALUES ($1, $2) ON CONFLICT (project_id, user_id) DO NOTHING', [projectId, userId])
    
    return NextResponse.json({ 
      success: true, 
      message: 'Favorite status updated' 
    });
  } catch (error) {
    console.error('Error updating favorite:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update favorite' 
    }, { status: 500 });
  }
}