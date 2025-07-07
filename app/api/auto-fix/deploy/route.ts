// app/api/auto-fix/deploy/route.ts
import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/neon"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  })
}

export async function POST(request: Request) {
  try {
    console.log('🚀 Deployment request received')

    // Validate environment variables
    const requiredEnvVars = {
      VERCEL_ACCESS_TOKEN: process.env.VERCEL_ACCESS_TOKEN,
      VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
      GITHUB_REPO_ID: process.env.GITHUB_REPO_ID
    }

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars)
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing environment variables: ${missingVars.join(', ')}`,
          details: 'Please check your Vercel environment variables'
        },
        { status: 500, headers: corsHeaders }
      )
    }

    // Method 1: Try hook-based deployment (recommended)
    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      try {
        console.log('📡 Attempting hook-based deployment...')
        
        const hookResponse = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (hookResponse.ok) {
          const hookData = await hookResponse.text()
          console.log('✅ Hook deployment successful')
          
          await logToDatabase('info', 'Deployment triggered via hook', { method: 'hook' })
          
          return NextResponse.json({
            success: true,
            method: 'hook',
            deploymentId: 'hook-triggered',
            message: 'Deployment triggered successfully via deploy hook',
            timestamp: new Date().toISOString()
          }, { headers: corsHeaders })
        }
      } catch (hookError) {
        console.log('⚠️ Hook deployment failed, trying API method:', hookError)
      }
    }

    // Method 2: Direct API deployment
    console.log('📡 Attempting API-based deployment...')
    
    const deploymentPayload = {
      name: "aiapktodev",
      gitSource: {
        type: "github",
        repoId: process.env.GITHUB_REPO_ID,
        ref: "main"
      },
      target: "production",
      projectSettings: {
        framework: "nextjs"
      }
    }

    console.log('📦 Deployment payload:', JSON.stringify(deploymentPayload, null, 2))

    const apiUrl = process.env.VERCEL_TEAM_ID 
      ? `https://api.vercel.com/v13/deployments?teamId=${process.env.VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v13/deployments`

    const deployResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deploymentPayload)
    })

    const responseText = await deployResponse.text()
    console.log('📝 Vercel API Response Status:', deployResponse.status)
    console.log('📝 Vercel API Response:', responseText)

    if (!deployResponse.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { message: responseText }
      }

      const errorMessage = errorData.error?.message || errorData.message || 'Unknown deployment error'
      console.error('❌ Deployment API error:', errorMessage)

      // Method 3: Fallback to simple redeploy
      if (deployResponse.status === 400 || deployResponse.status === 422) {
        console.log('🔄 Trying simplified deployment...')
        
        const simplePayload = {
          name: "aiapktodev",
          target: "production"
        }

        const simpleResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(simplePayload)
        })

        if (simpleResponse.ok) {
          const simpleData = await simpleResponse.json()
          console.log('✅ Simple deployment successful:', simpleData)
          
          await logToDatabase('info', 'Deployment triggered via simple API', { method: 'simple-api', data: simpleData })
          
          return NextResponse.json({
            success: true,
            method: 'simple-api',
            deploymentId: simpleData.id,
            url: simpleData.url,
            message: 'Deployment triggered successfully via simple API',
            timestamp: new Date().toISOString()
          }, { headers: corsHeaders })
        }
      }

      await logToDatabase('error', 'Deployment failed', { 
        error: errorMessage, 
        status: deployResponse.status,
        response: responseText 
      })

      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: errorData,
        status: deployResponse.status,
        timestamp: new Date().toISOString()
      }, { 
        status: deployResponse.status >= 500 ? 500 : 400, 
        headers: corsHeaders 
      })
    }

    const deploymentData = JSON.parse(responseText)
    console.log('✅ Deployment successful:', deploymentData)

    await logToDatabase('info', 'Deployment triggered successfully', { 
      method: 'api',
      deploymentId: deploymentData.id,
      url: deploymentData.url 
    })

    return NextResponse.json({
      success: true,
      method: 'api',
      deploymentId: deploymentData.id,
      url: deploymentData.url,
      status: deploymentData.readyState || deploymentData.state,
      message: 'Deployment triggered successfully',
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Deployment endpoint error:', error)
    
    await logToDatabase('error', 'Deployment endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined // FIXED: Added 'undefined'
    })

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Deployment failed',
      timestamp: new Date().toISOString()
    }, { 
      status: 500, 
      headers: corsHeaders 
    })
  }
}

async function logToDatabase(level: string, message: string, metadata: object = {}) {
  try {
    const sql = getDatabase()
    if (sql) {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES (
          ${level},
          ${message},
          'auto-fix-deploy',
          ${JSON.stringify(metadata)},
          NOW()
        )
      `
    }
  } catch (error) {
    console.error('Failed to log to database:', error)
  }
}
