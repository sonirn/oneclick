import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const timeRange = searchParams.get('timeRange') || '30d'

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // Calculate date range
    const days = parseInt(timeRange.replace('d', ''))
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get total projects
    const projectsResult = await db.query(
      'SELECT COUNT(*) as count FROM projects WHERE user_id = $1 AND created_at >= $2',
      [userId, startDate.toISOString()]
    )
    const totalProjects = parseInt(projectsResult.rows[0].count)

    // Get total videos
    const videosResult = await db.query(
      `SELECT COUNT(*) as count FROM generated_videos gv
       JOIN projects p ON gv.project_id = p.id
       WHERE p.user_id = $1 AND gv.created_at >= $2 AND gv.status = 'completed'`,
      [userId, startDate.toISOString()]
    )
    const totalVideos = parseInt(videosResult.rows[0].count)

    // Get success rate
    const successResult = await db.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN gv.status = 'completed' THEN 1 END) as completed
       FROM generated_videos gv
       JOIN projects p ON gv.project_id = p.id
       WHERE p.user_id = $1 AND gv.created_at >= $2`,
      [userId, startDate.toISOString()]
    )
    const successRate = successResult.rows[0].total > 0 
      ? Math.round((successResult.rows[0].completed / successResult.rows[0].total) * 100)
      : 0

    // Get model usage
    const modelUsageResult = await db.query(
      `SELECT 
         ai_model_used as model,
         COUNT(*) as count,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
         AVG(CASE WHEN status = 'completed' THEN 
           EXTRACT(EPOCH FROM (updated_at - created_at)) 
         END) as avg_time_seconds
       FROM generated_videos gv
       JOIN projects p ON gv.project_id = p.id
       WHERE p.user_id = $1 AND gv.created_at >= $2
       GROUP BY ai_model_used
       ORDER BY count DESC`,
      [userId, startDate.toISOString()]
    )

    const modelUsage = modelUsageResult.rows.map(row => ({
      model: row.model,
      count: parseInt(row.count),
      success_rate: row.count > 0 ? Math.round((row.completed / row.count) * 100) : 0,
      avg_time: row.avg_time_seconds ? `${Math.round(row.avg_time_seconds / 60)}m` : 'N/A'
    }))

    // Get recent activity
    const activityResult = await db.query(
      `SELECT 
         'project_created' as type,
         'Project "' || title || '" created' as description,
         created_at as timestamp,
         'success' as status
       FROM projects 
       WHERE user_id = $1 AND created_at >= $2
       
       UNION ALL
       
       SELECT 
         'video_generated' as type,
         'Video generated using ' || ai_model_used as description,
         gv.created_at as timestamp,
         CASE WHEN gv.status = 'completed' THEN 'success' ELSE 'error' END as status
       FROM generated_videos gv
       JOIN projects p ON gv.project_id = p.id
       WHERE p.user_id = $1 AND gv.created_at >= $2
       
       ORDER BY timestamp DESC
       LIMIT 10`,
      [userId, startDate.toISOString()]
    )

    const recentActivity = activityResult.rows.map((row, index) => ({
      id: index.toString(),
      type: row.type,
      description: row.description,
      timestamp: row.timestamp,
      status: row.status
    }))

    // Get processing trends (simplified)
    const trendsResult = await db.query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as projects,
         0 as videos,
         100 as success_rate
       FROM projects
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 7`,
      [userId, startDate.toISOString()]
    )

    const processingTrends = trendsResult.rows.map(row => ({
      date: row.date,
      projects: parseInt(row.projects),
      videos: parseInt(row.videos),
      success_rate: parseInt(row.success_rate)
    }))

    const analytics = {
      totalProjects,
      totalVideos,
      totalDownloads: Math.floor(totalVideos * 0.7), // Mock download count
      totalViews: Math.floor(totalVideos * 2.3), // Mock view count
      avgProcessingTime: '3m 45s',
      successRate,
      mostUsedModel: modelUsage[0]?.model || 'N/A',
      recentActivity,
      processingTrends,
      modelUsage
    }

    return NextResponse.json({ 
      success: true, 
      analytics 
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    }, { status: 500 })
  }
}