// AI-Enhanced APK Analysis Service
import { a4fClient } from './a4f-client'
import AdmZip from 'adm-zip'
import { parseString } from 'xml2js'

export interface ApkMetadata {
  filename: string
  size: number
  packageName?: string
  versionName?: string
  versionCode?: number
  minSdkVersion?: number
  targetSdkVersion?: number
  permissions: string[]
  activities: string[]
  services: string[]
  receivers: string[]
  features: string[]
  hasNativeLibs: boolean
  hasObfuscation: boolean
  certificateInfo?: any
}

export interface AiAnalysisResult {
  security_assessment: {
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    vulnerabilities: string[]
    recommendations: string[]
  }
  conversion_strategy: {
    recommended_mode: 'debug' | 'sandbox' | 'combined'
    special_handling: string[]
    potential_issues: string[]
  }
  optimization_suggestions: string[]
  error_prevention: string[]
}

export class AiApkAnalyzer {
  async extractApkMetadata(apkBuffer: Buffer, filename: string): Promise<ApkMetadata> {
    try {
      const zip = new AdmZip(apkBuffer)
      const entries = zip.getEntries()
      
      const metadata: ApkMetadata = {
        filename,
        size: apkBuffer.length,
        permissions: [],
        activities: [],
        services: [],
        receivers: [],
        features: [],
        hasNativeLibs: false,
        hasObfuscation: false
      }

      // Check for native libraries
      metadata.hasNativeLibs = entries.some(entry => entry.entryName.startsWith('lib/'))

      // Check for obfuscation indicators
      metadata.hasObfuscation = entries.some(entry => 
        entry.entryName.includes('classes.dex') && entry.getData().length < apkBuffer.length * 0.1
      )

      // Extract AndroidManifest.xml
      const manifestEntry = zip.getEntry('AndroidManifest.xml')
      if (manifestEntry) {
        try {
          const manifestData = manifestEntry.getData().toString()
          await this.parseManifest(manifestData, metadata)
        } catch (error) {
          console.log('Could not parse binary manifest, using basic analysis')
        }
      }

      // Analyze DEX files
      const dexFiles = entries.filter(entry => entry.entryName.endsWith('.dex'))
      metadata.features.push(`${dexFiles.length} DEX file(s)`)

      // Check for specific security features
      if (entries.some(entry => entry.entryName.includes('META-INF/'))) {
        metadata.features.push('Signed APK')
      }

      return metadata
    } catch (error) {
      console.error('Error extracting APK metadata:', error)
      throw new Error(`Failed to extract APK metadata: ${error.message}`)
    }
  }

  private async parseManifest(manifestXml: string, metadata: ApkMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      parseString(manifestXml, (err, result) => {
        if (err) {
          resolve() // Continue without manifest parsing
          return
        }

        try {
          const manifest = result.manifest
          
          // Extract basic app info
          if (manifest.$) {
            metadata.packageName = manifest.$.package
            metadata.versionName = manifest.$['android:versionName']
            metadata.versionCode = parseInt(manifest.$['android:versionCode'] || '0')
          }

          // Extract SDK versions
          if (manifest['uses-sdk']) {
            const sdk = manifest['uses-sdk'][0].$
            metadata.minSdkVersion = parseInt(sdk['android:minSdkVersion'] || '1')
            metadata.targetSdkVersion = parseInt(sdk['android:targetSdkVersion'] || '1')
          }

          // Extract permissions
          if (manifest['uses-permission']) {
            metadata.permissions = manifest['uses-permission'].map((perm: any) => 
              perm.$['android:name']
            )
          }

          // Extract application components
          if (manifest.application && manifest.application[0]) {
            const app = manifest.application[0]
            
            if (app.activity) {
              metadata.activities = app.activity.map((act: any) => act.$['android:name'])
            }
            
            if (app.service) {
              metadata.services = app.service.map((svc: any) => svc.$['android:name'])
            }
            
            if (app.receiver) {
              metadata.receivers = app.receiver.map((rcv: any) => rcv.$['android:name'])
            }
          }

          resolve()
        } catch (parseError) {
          resolve() // Continue without complete manifest data
        }
      })
    })
  }

  async performAiAnalysis(metadata: ApkMetadata): Promise<AiAnalysisResult> {
    try {
      const analysisPrompt = {
        apk_metadata: metadata,
        analysis_focus: [
          'Security vulnerabilities and risks',
          'Optimal conversion strategy',
          'Potential conversion errors',
          'Performance optimization opportunities',
          'Compatibility considerations'
        ]
      }

      const aiResponse = await a4fClient.analyzeApkStructure(analysisPrompt)
      
      // Parse AI response (assuming it returns structured JSON)
      let parsedResponse: AiAnalysisResult
      try {
        parsedResponse = JSON.parse(aiResponse)
      } catch (parseError) {
        // If AI doesn't return valid JSON, create structured response
        parsedResponse = this.parseUnstructuredResponse(aiResponse, metadata)
      }

      return parsedResponse
    } catch (error) {
      console.error('AI analysis error:', error)
      // Return fallback analysis
      return this.generateFallbackAnalysis(metadata)
    }
  }

  private parseUnstructuredResponse(response: string, metadata: ApkMetadata): AiAnalysisResult {
    // Extract structured data from unstructured AI response
    const riskLevel = this.extractRiskLevel(response, metadata)
    const vulnerabilities = this.extractVulnerabilities(response)
    const recommendations = this.extractRecommendations(response)
    
    return {
      security_assessment: {
        risk_level: riskLevel,
        vulnerabilities,
        recommendations
      },
      conversion_strategy: {
        recommended_mode: this.recommendConversionMode(metadata),
        special_handling: this.extractSpecialHandling(response),
        potential_issues: this.extractPotentialIssues(response)
      },
      optimization_suggestions: this.extractOptimizations(response),
      error_prevention: this.extractErrorPrevention(response)
    }
  }

  private extractRiskLevel(response: string, metadata: ApkMetadata): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const riskIndicators = [
      { keywords: ['critical', 'severe', 'high risk'], level: 'CRITICAL' as const },
      { keywords: ['high', 'significant', 'major'], level: 'HIGH' as const },
      { keywords: ['medium', 'moderate', 'some'], level: 'MEDIUM' as const },
      { keywords: ['low', 'minimal', 'minor'], level: 'LOW' as const }
    ]

    const responseToCheck = response.toLowerCase()
    
    for (const indicator of riskIndicators) {
      if (indicator.keywords.some(keyword => responseToCheck.includes(keyword))) {
        return indicator.level
      }
    }

    // Default assessment based on metadata
    if (metadata.permissions.length > 20 || metadata.hasObfuscation) {
      return 'HIGH'
    } else if (metadata.permissions.length > 10) {
      return 'MEDIUM'
    }
    
    return 'LOW'
  }

  private extractVulnerabilities(response: string): string[] {
    const vulnerabilityPatterns = [
      /vulnerabilit(?:y|ies):\s*(.+)/gi,
      /security\s+(?:issue|problem|concern):\s*(.+)/gi,
      /risk:\s*(.+)/gi
    ]

    const vulnerabilities: string[] = []
    
    for (const pattern of vulnerabilityPatterns) {
      const matches = response.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          vulnerabilities.push(match[1].trim())
        }
      }
    }

    return vulnerabilities.length > 0 ? vulnerabilities : ['No specific vulnerabilities identified']
  }

  private extractRecommendations(response: string): string[] {
    const recommendationPatterns = [
      /recommend(?:ation|ed)?:\s*(.+)/gi,
      /suggest(?:ion|ed)?:\s*(.+)/gi,
      /should\s+(.+)/gi
    ]

    const recommendations: string[] = []
    
    for (const pattern of recommendationPatterns) {
      const matches = response.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          recommendations.push(match[1].trim())
        }
      }
    }

    return recommendations.length > 0 ? recommendations : ['Follow standard security practices']
  }

  private recommendConversionMode(metadata: ApkMetadata): 'debug' | 'sandbox' | 'combined' {
    // AI-driven mode recommendation based on metadata
    if (metadata.hasObfuscation || metadata.permissions.length > 25) {
      return 'combined' // Maximum analysis capabilities needed
    } else if (metadata.permissions.length > 15 || metadata.hasNativeLibs) {
      return 'sandbox' // Security testing capabilities needed
    }
    return 'debug' // Standard debugging sufficient
  }

  private extractSpecialHandling(response: string): string[] {
    const specialHandlingPatterns = [
      /special\s+handling:\s*(.+)/gi,
      /requires?\s+(.+)/gi,
      /must\s+(.+)/gi
    ]

    const specialHandling: string[] = []
    
    for (const pattern of specialHandlingPatterns) {
      const matches = response.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          specialHandling.push(match[1].trim())
        }
      }
    }

    return specialHandling
  }

  private extractPotentialIssues(response: string): string[] {
    const issuePatterns = [
      /(?:potential\s+)?(?:issue|problem):\s*(.+)/gi,
      /may\s+(?:cause|result\s+in)\s+(.+)/gi,
      /could\s+(?:lead\s+to|cause)\s+(.+)/gi
    ]

    const issues: string[] = []
    
    for (const pattern of issuePatterns) {
      const matches = response.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          issues.push(match[1].trim())
        }
      }
    }

    return issues
  }

  private extractOptimizations(response: string): string[] {
    const optimizationPatterns = [
      /optim(?:ization|ize):\s*(.+)/gi,
      /improve(?:ment)?:\s*(.+)/gi,
      /enhance(?:ment)?:\s*(.+)/gi
    ]

    const optimizations: string[] = []
    
    for (const pattern of optimizationPatterns) {
      const matches = response.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          optimizations.push(match[1].trim())
        }
      }
    }

    return optimizations
  }

  private extractErrorPrevention(response: string): string[] {
    const preventionPatterns = [
      /prevent:\s*(.+)/gi,
      /avoid:\s*(.+)/gi,
      /(?:to\s+)?ensure:\s*(.+)/gi
    ]

    const prevention: string[] = []
    
    for (const pattern of preventionPatterns) {
      const matches = response.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          prevention.push(match[1].trim())
        }
      }
    }

    return prevention
  }

  private generateFallbackAnalysis(metadata: ApkMetadata): AiAnalysisResult {
    // Fallback analysis when AI is unavailable
    const riskLevel = metadata.permissions.length > 20 ? 'HIGH' : 
                     metadata.permissions.length > 10 ? 'MEDIUM' : 'LOW'
    
    return {
      security_assessment: {
        risk_level: riskLevel,
        vulnerabilities: [
          ...(metadata.hasObfuscation ? ['Code obfuscation detected'] : []),
          ...(metadata.permissions.length > 20 ? ['Excessive permissions'] : []),
          ...(metadata.hasNativeLibs ? ['Native libraries present'] : [])
        ],
        recommendations: [
          'Perform thorough security testing',
          'Review all permissions carefully',
          'Use appropriate conversion mode',
          'Monitor for suspicious behavior'
        ]
      },
      conversion_strategy: {
        recommended_mode: this.recommendConversionMode(metadata),
        special_handling: [
          ...(metadata.hasObfuscation ? ['Handle obfuscated code carefully'] : []),
          ...(metadata.hasNativeLibs ? ['Process native libraries separately'] : [])
        ],
        potential_issues: [
          'Manifest parsing complexities',
          'Signature verification issues',
          'Compatibility concerns'
        ]
      },
      optimization_suggestions: [
        'Enable comprehensive logging',
        'Add debug certificates',
        'Optimize manifest permissions',
        'Include security testing features'
      ],
      error_prevention: [
        'Validate APK structure before conversion',
        'Check for manifest integrity',
        'Ensure proper signing procedures',
        'Test on multiple devices'
      ]
    }
  }

  async generateErrorResolution(error: string, metadata: ApkMetadata, mode: string): Promise<string> {
    try {
      const resolution = await a4fClient.analyzeConversionError(error, metadata, mode)
      return resolution
    } catch (aiError) {
      console.error('AI error resolution failed:', aiError)
      return this.generateFallbackErrorResolution(error, metadata, mode)
    }
  }

  private generateFallbackErrorResolution(error: string, metadata: ApkMetadata, mode: string): string {
    const commonSolutions = {
      'AndroidManifest.xml': [
        'Check manifest file integrity',
        'Verify XML syntax and structure',
        'Ensure proper namespace declarations',
        'Validate permission declarations'
      ],
      'signature': [
        'Re-sign with debug keystore',
        'Check certificate validity',
        'Ensure proper signing procedure',
        'Verify keystore accessibility'
      ],
      'dex': [
        'Check DEX file integrity',
        'Verify Dalvik bytecode validity',
        'Handle multidex applications properly',
        'Optimize DEX file processing'
      ],
      'permissions': [
        'Review permission compatibility',
        'Check target SDK requirements',
        'Validate permission syntax',
        'Handle runtime permissions'
      ]
    }

    let relevantSolutions: string[] = []
    
    for (const [errorType, solutions] of Object.entries(commonSolutions)) {
      if (error.toLowerCase().includes(errorType.toLowerCase())) {
        relevantSolutions = solutions
        break
      }
    }

    if (relevantSolutions.length === 0) {
      relevantSolutions = [
        'Check APK file integrity',
        'Verify all required components are present',
        'Ensure proper file permissions',
        'Try alternative conversion approach'
      ]
    }

    return `Error Resolution for ${mode} mode conversion:

Error: ${error}

Recommended Solutions:
${relevantSolutions.map((solution, index) => `${index + 1}. ${solution}`).join('\n')}

Additional Steps:
- Check system compatibility
- Verify available disk space
- Ensure network connectivity for downloads
- Consider using different conversion mode

APK Analysis:
- Package: ${metadata.packageName || 'Unknown'}
- Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB
- Permissions: ${metadata.permissions.length}
- Has native libs: ${metadata.hasNativeLibs ? 'Yes' : 'No'}
- Obfuscated: ${metadata.hasObfuscation ? 'Yes' : 'No'}`
  }
}

export const aiApkAnalyzer = new AiApkAnalyzer()
export default AiApkAnalyzer