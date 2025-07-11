import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { chatService } from '@/lib/enhanced-ai-services'

export async function POST(request: NextRequest) {
  try {
    const { projectId, message, chatHistory = [] } = await request.json()

    if (!projectId || !message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID and message are required' 
      }, { status: 400 })
    }

    // Get project details with plan
    const projectQuery = 'SELECT * FROM projects WHERE id = $1'
    const projectResult = await db.query(projectQuery, [projectId])
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 })
    }

    const project = projectResult.rows[0]

    if (!project.generation_plan) {
      return NextResponse.json({ 
        success: false, 
        error: 'No generation plan found. Please create a plan first.' 
      }, { status: 400 })
    }

    // Parse the generation plan JSON string
    let parsedPlan;
    try {
      parsedPlan = typeof project.generation_plan === 'string' 
        ? JSON.parse(project.generation_plan) 
        : project.generation_plan;
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid generation plan format. Please regenerate the plan.' 
      }, { status: 400 })
    }

    try {
      console.log('Processing chat message for project:', projectId)
      
      // Get AI response about the plan
      const chatResult = await chatService.chatAboutPlan(
        parsedPlan,
        chatHistory,
        message
      )

      if (!chatResult.success) {
        return NextResponse.json({ 
          success: false, 
          error: 'error' in chatResult ? chatResult.error : 'Chat failed'
        }, { status: 500 })
      }

      // Check if the response contains plan updates
      let updatedPlan = parsedPlan
      let planUpdated = false
      let updateSummary = null

      if ('response' in chatResult) {
        const updateResult = await chatService.extractPlanUpdates(
          chatResult.response,
          parsedPlan
        )

        if (updateResult.success && updateResult.updates?.has_updates) {
          // Merge updates into the existing plan
          updatedPlan = {
            ...parsedPlan,
            ...updateResult.updates.updated_sections
          }
          planUpdated = true
          updateSummary = updateResult.updates.summary

          // Update the project with the modified plan
          await db.query(
            `UPDATE projects 
             SET generation_plan = $1, updated_at = NOW() 
             WHERE id = $2`,
            [JSON.stringify(updatedPlan), projectId]
          )

          console.log('Plan updated based on chat:', updateResult.updates.summary)
        }
      }

      return NextResponse.json({ 
        success: true, 
        response: 'response' in chatResult ? chatResult.response : 'Chat failed',
        plan_updated: planUpdated,
        updated_plan: planUpdated ? updatedPlan : null,
        update_summary: updateSummary,
        timestamp: 'timestamp' in chatResult ? chatResult.timestamp : new Date().toISOString()
      })
    } catch (chatError) {
      console.error('Chat processing error:', chatError)
      return NextResponse.json({ 
        success: false, 
        error: 'Chat processing failed'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process chat message' 
    }, { status: 500 })
  }
}

// Get chat history for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    // For now, return empty chat history since we're not storing chat messages
    // In a production app, you'd want to store chat messages in the database
    return NextResponse.json({ 
      success: true, 
      chat_history: [],
      message: 'Chat history feature coming soon'
    })
  } catch (error) {
    console.error('Error fetching chat history:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch chat history' 
    }, { status: 500 })
  }
}