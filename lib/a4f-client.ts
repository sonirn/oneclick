// A4F AI Playground Client for Enhanced APK Analysis
import axios, { AxiosInstance, AxiosResponse } from 'axios'

export interface A4FMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface A4FRequest {
  model: string
  messages: A4FMessage[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
}

export interface A4FResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ApkAnalysisResult {
  security_analysis: string
  vulnerability_report: string
  error_recommendations: string
  optimization_suggestions: string
  conversion_strategy: string
}

export class A4FClient {
  private client: AxiosInstance
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.A4F_API_KEY || ''
    this.baseUrl = process.env.A4F_BASE_URL || 'https://api.a4f.dev'
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: parseInt(process.env.AI_TIMEOUT || '60000'),
    })
  }

  async getAvailableModels(): Promise<any[]> {
    try {
      const response = await this.client.get('/v1/models')
      return response.data.data || []
    } catch (error) {
      console.error('Failed to get A4F models:', error)
      throw new Error('Failed to retrieve available AI models')
    }
  }

  async chatCompletion(request: A4FRequest): Promise<A4FResponse> {
    try {
      const response: AxiosResponse<A4FResponse> = await this.client.post('/v1/chat/completions', {
        ...request,
        max_tokens: request.max_tokens || parseInt(process.env.AI_MAX_TOKENS || '4096'),
        temperature: request.temperature || parseFloat(process.env.AI_TEMPERATURE || '0.3'),
      })
      return response.data
    } catch (error: any) {
      console.error('A4F API Error:', error.response?.data || error.message)
      throw new Error(`AI API Error: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  async analyzeApkStructure(apkInfo: any): Promise<string> {
    const request: A4FRequest = {
      model: process.env.A4F_ANALYSIS_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert Android APK security analyst and reverse engineer. Analyze APK files for:
1. Security vulnerabilities and potential risks
2. Permissions analysis and privacy concerns
3. Code obfuscation and anti-debugging techniques
4. Malware signatures and suspicious patterns
5. Performance optimization opportunities
6. Compatibility issues and conversion recommendations

Provide detailed, actionable insights in JSON format with sections: security_analysis, vulnerability_report, recommendations, optimization_suggestions.`
        },
        {
          role: 'user',
          content: `Analyze this APK structure and provide comprehensive security and technical analysis:\n\n${JSON.stringify(apkInfo, null, 2)}`
        }
      ]
    }

    const response = await this.chatCompletion(request)
    return response.choices[0].message.content
  }

  async analyzeConversionError(error: string, apkData: any, conversionMode: string): Promise<string> {
    const request: A4FRequest = {
      model: process.env.A4F_ERROR_HANDLING_MODEL || 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'system',
          content: `You are an expert APK conversion troubleshooter. Analyze conversion errors and provide:
1. Root cause analysis of the error
2. Step-by-step resolution strategies
3. Alternative conversion approaches
4. Prevention recommendations for future conversions
5. Code fixes and workarounds

Focus on practical, implementable solutions for APK conversion issues.`
        },
        {
          role: 'user',
          content: `APK Conversion Error Analysis:
Error: ${error}
Conversion Mode: ${conversionMode}
APK Data: ${JSON.stringify(apkData, null, 2)}

Please provide detailed error analysis and resolution steps.`
        }
      ]
    }

    const response = await this.chatCompletion(request)
    return response.choices[0].message.content
  }

  async generateConversionStrategy(apkInfo: any, mode: string): Promise<string> {
    const request: A4FRequest = {
      model: process.env.A4F_CODING_MODEL || 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'system',
          content: `You are an expert APK modification and reverse engineering specialist. Generate optimal conversion strategies for:
1. Debug mode conversions with maximum debugging capabilities
2. Sandbox mode with security bypass and testing features
3. Combined mode with comprehensive reverse engineering tools
4. Error-resistant conversion approaches
5. Performance optimization during conversion

Provide specific technical recommendations and code modifications.`
        },
        {
          role: 'user',
          content: `Generate optimal conversion strategy for:
Mode: ${mode}
APK Info: ${JSON.stringify(apkInfo, null, 2)}

Please provide detailed strategy with specific implementation steps.`
        }
      ]
    }

    const response = await this.chatCompletion(request)
    return response.choices[0].message.content
  }

  async optimizeManifest(manifestXml: string, mode: string): Promise<string> {
    const request: A4FRequest = {
      model: process.env.A4F_CODING_MODEL || 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'system',
          content: `You are an expert Android manifest optimizer and security researcher. Optimize AndroidManifest.xml files for:
1. Maximum debugging and analysis capabilities
2. Enhanced security testing permissions
3. Advanced reverse engineering features
4. Anti-detection and bypass capabilities
5. Performance and compatibility improvements

Return only the optimized XML content without explanations.`
        },
        {
          role: 'user',
          content: `Optimize this AndroidManifest.xml for ${mode} mode with advanced reverse engineering capabilities:

${manifestXml}`
        }
      ]
    }

    const response = await this.chatCompletion(request)
    return response.choices[0].message.content
  }

  async generateSecurityBypassCode(targetApp: string, bypassType: string): Promise<string> {
    const request: A4FRequest = {
      model: process.env.A4F_CODING_MODEL || 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'system',
          content: `You are an expert security researcher specializing in mobile application security testing. Generate professional security bypass code for:
1. Root detection bypass
2. Anti-debugging bypass
3. SSL pinning bypass
4. Tamper detection bypass
5. License verification bypass

IMPORTANT: This is for legitimate security testing and research purposes only. Provide educational, well-documented code.`
        },
        {
          role: 'user',
          content: `Generate ${bypassType} bypass code for security testing of ${targetApp}. Include detailed comments explaining the technique and implementation.`
        }
      ]
    }

    const response = await this.chatCompletion(request)
    return response.choices[0].message.content
  }

  async analyzeAndFixCode(code: string, language: string = 'java'): Promise<string> {
    const request: A4FRequest = {
      model: process.env.A4F_CODING_MODEL || 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'system',
          content: `You are an expert ${language} developer and code reviewer. Analyze code for:
1. Syntax errors and bugs
2. Security vulnerabilities
3. Performance issues
4. Best practice violations
5. Potential improvements

Provide corrected code with detailed explanations of fixes.`
        },
        {
          role: 'user',
          content: `Analyze and fix this ${language} code:

${code}`
        }
      ]
    }

    const response = await this.chatCompletion(request)
    return response.choices[0].message.content
  }

  async generateTestingReport(analysisData: any): Promise<string> {
    const request: A4FRequest = {
      model: process.env.A4F_ANALYSIS_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional security testing report generator. Create comprehensive reports including:
1. Executive summary with key findings
2. Technical analysis details
3. Security vulnerability assessment
4. Risk analysis and ratings
5. Remediation recommendations
6. Compliance status

Generate professional, well-structured reports in markdown format.`
        },
        {
          role: 'user',
          content: `Generate a comprehensive security testing report based on this analysis data:

${JSON.stringify(analysisData, null, 2)}`
        }
      ]
    }

    const response = await this.chatCompletion(request)
    return response.choices[0].message.content
  }
}

// Export singleton instance
export const a4fClient = new A4FClient()
export default A4FClient