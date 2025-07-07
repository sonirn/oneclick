import { type NextRequest, NextResponse } from "next/server"
import { uploadFile, createConversion } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase"
import AdmZip from "adm-zip"
import { v4 as uuidv4 } from "uuid"
import xml2js from 'xml2js'
import { parseString, Builder } from 'xml2js'

// Enhanced logging function
function sendLog(clientId: string, message: string, logType = "info") {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${clientId?.slice(0, 8) || "UNKNOWN"}] ${message}`)
}

// APK Validation with comprehensive checks
async function validateAPK(apkBuffer: Buffer, clientId: string): Promise<boolean> {
  try {
    sendLog(clientId, "🔍 Validating APK structure...", "info")

    if (apkBuffer.length === 0) {
      throw new Error("APK file is empty")
    }

    if (apkBuffer.length > 500 * 1024 * 1024) {
      throw new Error("APK file is too large (>500MB)")
    }

    const zip = new AdmZip(apkBuffer)
    const entries = zip.getEntries()

    if (entries.length === 0) {
      throw new Error("APK contains no files")
    }

    // Check for required files
    const hasManifest = entries.some((entry) => entry.entryName === "AndroidManifest.xml")
    const hasDex = entries.some((entry) => entry.entryName.endsWith(".dex"))

    if (!hasManifest) {
      throw new Error("AndroidManifest.xml not found")
    }

    if (!hasDex) {
      sendLog(clientId, "⚠️ No DEX files found - APK may not be standard", "warning")
    }

    sendLog(
      clientId,
      `✅ APK validation passed (${entries.length} files, ${(apkBuffer.length / 1024 / 1024).toFixed(2)} MB)`,
      "success",
    )
    return true
  } catch (error) {
    sendLog(clientId, `❌ APK validation failed: ${error}`, "error")
    return false
  }
}

async function modifyManifest(manifestXml: string, mode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    parseString(manifestXml, (err, result) => {
      if (err) return reject(err)

      // Ensure manifest structure
      if (!result.manifest) result.manifest = {}
      if (!result.manifest.application) result.manifest.application = [{}]
      if (!result.manifest['uses-permission']) result.manifest['uses-permission'] = []

      // Comprehensive debug mode permissions for API monitoring and development
      const debugPermissions = [
        // Network and Internet
        { '$': { 'android:name': 'android.permission.INTERNET' } },
        { '$': { 'android:name': 'android.permission.ACCESS_NETWORK_STATE' } },
        { '$': { 'android:name': 'android.permission.ACCESS_WIFI_STATE' } },
        { '$': { 'android:name': 'android.permission.CHANGE_WIFI_STATE' } },
        { '$': { 'android:name': 'android.permission.CHANGE_NETWORK_STATE' } },
        
        // Storage for logging and debugging
        { '$': { 'android:name': 'android.permission.WRITE_EXTERNAL_STORAGE' } },
        { '$': { 'android:name': 'android.permission.READ_EXTERNAL_STORAGE' } },
        { '$': { 'android:name': 'android.permission.MANAGE_EXTERNAL_STORAGE' } },
        
        // Development and debugging
        { '$': { 'android:name': 'android.permission.SET_DEBUG_APP' } },
        { '$': { 'android:name': 'android.permission.DUMP' } },
        { '$': { 'android:name': 'android.permission.READ_LOGS' } },
        { '$': { 'android:name': 'android.permission.WRITE_SECURE_SETTINGS' } },
        
        // System level access for comprehensive debugging
        { '$': { 'android:name': 'android.permission.SYSTEM_ALERT_WINDOW' } },
        { '$': { 'android:name': 'android.permission.WRITE_SETTINGS' } },
        { '$': { 'android:name': 'android.permission.GET_TASKS' } },
        { '$': { 'android:name': 'android.permission.REAL_GET_TASKS' } },
        
        // API monitoring and interception
        { '$': { 'android:name': 'android.permission.PACKAGE_USAGE_STATS' } },
        { '$': { 'android:name': 'android.permission.ACCESS_SUPERUSER' } },
        { '$': { 'android:name': 'android.permission.CAPTURE_AUDIO_OUTPUT' } },
        { '$': { 'android:name': 'android.permission.CAPTURE_SECURE_VIDEO_OUTPUT' } },
        
        // Location for testing location-based APIs
        { '$': { 'android:name': 'android.permission.ACCESS_FINE_LOCATION' } },
        { '$': { 'android:name': 'android.permission.ACCESS_COARSE_LOCATION' } },
        { '$': { 'android:name': 'android.permission.ACCESS_BACKGROUND_LOCATION' } },
        
        // Camera and microphone for testing media APIs
        { '$': { 'android:name': 'android.permission.CAMERA' } },
        { '$': { 'android:name': 'android.permission.RECORD_AUDIO' } },
        
        // Contacts and accounts for testing social APIs
        { '$': { 'android:name': 'android.permission.READ_CONTACTS' } },
        { '$': { 'android:name': 'android.permission.WRITE_CONTACTS' } },
        { '$': { 'android:name': 'android.permission.GET_ACCOUNTS' } },
        { '$': { 'android:name': 'android.permission.MANAGE_ACCOUNTS' } },
        
        // Phone and SMS for testing communication APIs
        { '$': { 'android:name': 'android.permission.READ_PHONE_STATE' } },
        { '$': { 'android:name': 'android.permission.CALL_PHONE' } },
        { '$': { 'android:name': 'android.permission.SEND_SMS' } },
        { '$': { 'android:name': 'android.permission.RECEIVE_SMS' } },
        
        // Calendar for testing calendar APIs
        { '$': { 'android:name': 'android.permission.READ_CALENDAR' } },
        { '$': { 'android:name': 'android.permission.WRITE_CALENDAR' } },
      ]

      // Add sandbox-specific permissions
      if (mode === "sandbox" || mode === "combined") {
        debugPermissions.push(
          // Billing and payment testing
          { '$': { 'android:name': 'com.android.vending.BILLING' } },
          { '$': { 'android:name': 'com.android.vending.CHECK_LICENSE' } },
          
          // Advanced debugging permissions
          { '$': { 'android:name': 'android.permission.BIND_ACCESSIBILITY_SERVICE' } },
          { '$': { 'android:name': 'android.permission.BIND_DEVICE_ADMIN' } },
          { '$': { 'android:name': 'android.permission.BIND_VPN_SERVICE' } },
          
          // System monitoring
          { '$': { 'android:name': 'android.permission.ACCESS_SUPERUSER' } },
          { '$': { 'android:name': 'android.permission.WRITE_SECURE_SETTINGS' } },
        )
      }

      // Add all permissions, avoiding duplicates
      const existingPermissions = result.manifest['uses-permission'].map(p => p?.['$']?.['android:name']).filter(Boolean)
      debugPermissions.forEach(permission => {
        const permissionName = permission['$']['android:name']
        if (!existingPermissions.includes(permissionName)) {
          result.manifest['uses-permission'].push(permission)
        }
      })

      // Configure application for maximum debugging
      const appConfig = {
        'android:debuggable': 'true',
        'android:allowBackup': 'true',
        'android:testOnly': mode === 'sandbox' ? 'true' : 'false',
        'android:extractNativeLibs': 'true',
        'android:usesCleartextTraffic': 'true',
        'android:networkSecurityConfig': '@xml/network_security_config',
        'android:largeHeap': 'true',
        'android:hardwareAccelerated': 'true',
        'android:vmSafeMode': 'false',
        'android:allowNativeHeapPointerTagging': 'false',
      }

      if (mode === 'sandbox' || mode === 'combined') {
        appConfig['android:name'] = 'com.debug.ApiMonitorApplication'
      }

      Object.assign(result.manifest.application[0], appConfig)

      // Add comprehensive metadata for API monitoring
      if (!result.manifest.application[0]['meta-data']) {
        result.manifest.application[0]['meta-data'] = []
      }

      const debugMetadata = [
        { '$': { 'android:name': 'debug.mode.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'api.monitoring.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'network.logging.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'http.interceptor.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'ssl.bypass.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'proxy.support.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'detailed.logging.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'performance.monitoring.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'memory.debugging.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'thread.monitoring.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'database.logging.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'exception.reporting.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'debug.overlay.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'api.response.caching.enabled', 'android:value': 'true' } },
        { '$': { 'android:name': 'request.replay.enabled', 'android:value': 'true' } },
      ]

      if (mode === 'sandbox' || mode === 'combined') {
        debugMetadata.push(
          { '$': { 'android:name': 'billing.debug.enabled', 'android:value': 'true' } },
          { '$': { 'android:name': 'payment.mock.enabled', 'android:value': 'true' } },
          { '$': { 'android:name': 'license.bypass.enabled', 'android:value': 'true' } },
          { '$': { 'android:name': 'security.testing.enabled', 'android:value': 'true' } },
        )
      }

      result.manifest.application[0]['meta-data'] = [
        ...result.manifest.application[0]['meta-data'],
        ...debugMetadata
      ]

      // Add debug services for API monitoring
      if (!result.manifest.application[0]['service']) {
        result.manifest.application[0]['service'] = []
      }

      const debugServices = [
        {
          '$': {
            'android:name': 'com.debug.ApiMonitorService',
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:process': ':monitor'
          }
        },
        {
          '$': {
            'android:name': 'com.debug.NetworkInterceptorService',
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:process': ':network'
          }
        },
        {
          '$': {
            'android:name': 'com.debug.LoggingService',
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:process': ':logging'
          }
        }
      ]

      result.manifest.application[0]['service'] = [
        ...result.manifest.application[0]['service'],
        ...debugServices
      ]

      // Add debug receivers for system events
      if (!result.manifest.application[0]['receiver']) {
        result.manifest.application[0]['receiver'] = []
      }

      const debugReceivers = [
        {
          '$': {
            'android:name': 'com.debug.NetworkStateReceiver',
            'android:enabled': 'true',
            'android:exported': 'false'
          },
          'intent-filter': [{
            'action': [
              { '$': { 'android:name': 'android.net.conn.CONNECTIVITY_CHANGE' } },
              { '$': { 'android:name': 'android.net.wifi.STATE_CHANGE' } }
            ]
          }]
        }
      ]

      result.manifest.application[0]['receiver'] = [
        ...result.manifest.application[0]['receiver'],
        ...debugReceivers
      ]

      const builder = new Builder()
      resolve(builder.buildObject(result))
    })
  })
}

async function modifyResources(resourcesXml: string, mode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!resourcesXml.trim()) {
      resourcesXml = '<resources></resources>'
    }

    parseString(resourcesXml, (err, result) => {
      if (err) return reject(err)

      if (!result.resources) {
        result.resources = {}
      }

      // Add boolean debug flags
      if (!result.resources['bool']) {
        result.resources['bool'] = []
      }

      const debugBooleans = [
        { '$': { 'name': 'debug_mode_enabled' }, '_': 'true' },
        { '$': { 'name': 'api_monitoring_enabled' }, '_': 'true' },
        { '$': { 'name': 'network_logging_enabled' }, '_': 'true' },
        { '$': { 'name': 'http_interceptor_enabled' }, '_': 'true' },
        { '$': { 'name': 'ssl_bypass_enabled' }, '_': 'true' },
        { '$': { 'name': 'proxy_support_enabled' }, '_': 'true' },
        { '$': { 'name': 'detailed_logging_enabled' }, '_': 'true' },
        { '$': { 'name': 'performance_monitoring_enabled' }, '_': 'true' },
        { '$': { 'name': 'memory_debugging_enabled' }, '_': 'true' },
        { '$': { 'name': 'thread_monitoring_enabled' }, '_': 'true' },
        { '$': { 'name': 'database_logging_enabled' }, '_': 'true' },
        { '$': { 'name': 'exception_reporting_enabled' }, '_': 'true' },
        { '$': { 'name': 'debug_overlay_enabled' }, '_': 'true' },
        { '$': { 'name': 'api_response_caching_enabled' }, '_': 'true' },
        { '$': { 'name': 'request_replay_enabled' }, '_': 'true' },
        { '$': { 'name': 'continuous_api_monitoring' }, '_': 'true' },
        { '$': { 'name': 'real_time_api_logging' }, '_': 'true' },
        { '$': { 'name': 'automatic_api_retry' }, '_': 'true' },
        { '$': { 'name': 'api_response_validation' }, '_': 'true' },
        { '$': { 'name': 'api_error_handling_debug' }, '_': 'true' },
      ]

      if (mode === 'sandbox' || mode === 'combined') {
        debugBooleans.push(
          { '$': { 'name': 'billing_debug_enabled' }, '_': 'true' },
          { '$': { 'name': 'payment_mock_enabled' }, '_': 'true' },
          { '$': { 'name': 'license_bypass_enabled' }, '_': 'true' },
          { '$': { 'name': 'security_testing_enabled' }, '_': 'true' },
          { '$': { 'name': 'sandbox_environment_active' }, '_': 'true' },
        )
      }

      result.resources['bool'] = [...result.resources['bool'], ...debugBooleans]

      // Add string configurations
      if (!result.resources['string']) {
        result.resources['string'] = []
      }

      const debugStrings = [
        { '$': { 'name': 'debug_mode' }, '_': mode },
        { '$': { 'name': 'api_base_url_debug' }, '_': 'https://api-debug.example.com' },
        { '$': { 'name': 'api_monitoring_endpoint' }, '_': 'https://monitor.debug.com/api' },
        { '$': { 'name': 'log_level' }, '_': 'VERBOSE' },
        { '$': { 'name': 'network_timeout_debug' }, '_': '30000' },
        { '$': { 'name': 'api_retry_count' }, '_': '5' },
        { '$': { 'name': 'api_retry_delay' }, '_': '2000' },
        { '$': { 'name': 'log_file_path' }, '_': '/sdcard/Android/data/package/files/debug_logs/' },
        { '$': { 'name': 'api_log_file' }, '_': 'api_monitor.log' },
        { '$': { 'name': 'network_log_file' }, '_': 'network_traffic.log' },
        { '$': { 'name': 'performance_log_file' }, '_': 'performance.log' },
        { '$': { 'name': 'error_log_file' }, '_': 'errors.log' },
        { '$': { 'name': 'debug_notification_channel' }, '_': 'DEBUG_MONITORING' },
        { '$': { 'name': 'api_monitoring_notification' }, '_': 'API calls are being monitored for debugging' },
      ]

      if (mode === 'sandbox' || mode === 'combined') {
        debugStrings.push(
          { '$': { 'name': 'sandbox_api_url' }, '_': 'https://sandbox-api.example.com' },
          { '$': { 'name': 'mock_payment_url' }, '_': 'https://sandbox-payments.googleapis.com' },
          { '$': { 'name': 'test_license_key' }, '_': 'test_license_key_123456' },
          { '$': { 'name': 'billing_test_environment' }, '_': 'sandbox' },
        )
      }

      result.resources['string'] = [...result.resources['string'], ...debugStrings]

      // Add integer configurations
      if (!result.resources['integer']) {
        result.resources['integer'] = []
      }

      const debugIntegers = [
        { '$': { 'name': 'api_monitoring_interval' }, '_': '1000' }, // Monitor every 1 second
        { '$': { 'name': 'log_buffer_size' }, '_': '10000' },
        { '$': { 'name': 'max_api_calls_per_minute' }, '_': '1000' },
        { '$': { 'name': 'network_timeout_milliseconds' }, '_': '30000' },
        { '$': { 'name': 'api_retry_max_attempts' }, '_': '5' },
        { '$': { 'name': 'log_file_max_size_mb' }, '_': '100' },
        { '$': { 'name': 'performance_sample_rate' }, '_': '100' }, // Sample 100% in debug mode
      ]

      result.resources['integer'] = [...result.resources['integer'], ...debugIntegers]

      // Add arrays for API monitoring configurations
      if (!result.resources['array']) {
        result.resources['array'] = []
      }

      const debugArrays = [
        {
          '$': { 'name': 'monitored_api_endpoints' },
          'item': [
            { '_': '/api/login' },
            { '_': '/api/auth' },
            { '_': '/api/user' },
            { '_': '/api/payment' },
            { '_': '/api/billing' },
            { '_': '/api/subscription' },
            { '_': '/api/data' },
            { '_': '/api/upload' },
            { '_': '/api/download' },
            { '_': '/api/analytics' },
          ]
        },
        {
          '$': { 'name': 'logged_http_methods' },
          'item': [
            { '_': 'GET' },
            { '_': 'POST' },
            { '_': 'PUT' },
            { '_': 'DELETE' },
            { '_': 'PATCH' },
            { '_': 'HEAD' },
            { '_': 'OPTIONS' },
          ]
        },
        {
          '$': { 'name': 'monitored_response_codes' },
          'item': [
            { '_': '200' },
            { '_': '201' },
            { '_': '400' },
            { '_': '401' },
            { '_': '403' },
            { '_': '404' },
            { '_': '500' },
            { '_': '502' },
            { '_': '503' },
          ]
        }
      ]

      result.resources['array'] = [...result.resources['array'], ...debugArrays]

      const builder = new Builder()
      resolve(builder.buildObject(result))
    })
  })
}

async function processAPK(apkBuffer: Buffer, mode: string, clientId: string): Promise<Buffer> {
  const zip = new AdmZip(apkBuffer)

  // 1. Process AndroidManifest.xml
  const manifestEntry = zip.getEntry("AndroidManifest.xml")
  if (!manifestEntry) {
    throw new Error("AndroidManifest.xml not found in APK")
  }

  const manifestXml = manifestEntry.getData().toString()
  const modifiedManifest = await modifyManifest(manifestXml, mode)
  zip.deleteFile("AndroidManifest.xml")
  zip.addFile("AndroidManifest.xml", Buffer.from(modifiedManifest))

  // 2. Process resources
  const resPath = "res/values/strings.xml"
  const resEntry = zip.getEntry(resPath)
  
  const resourcesXml = resEntry ? resEntry.getData().toString() : '<resources></resources>'
  const modifiedResources = await modifyResources(resourcesXml, mode)
  
  if (resEntry) {
    zip.deleteFile(resPath)
  }
  zip.addFile(resPath, Buffer.from(modifiedResources))

  return zip.toBuffer()
}

export async function POST(req: NextRequest) {
  const clientId = uuidv4()
  
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const mode = formData.get("mode") as string || "standard"

    if (!file) {
      sendLog(clientId, "❌ No file uploaded", "error")
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    sendLog(clientId, `📥 Received file: ${file.name} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`, "info")

    // Validate APK
    const isValid = await validateAPK(buffer, clientId)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid APK file" },
        { status: 400 }
      )
    }

    // Process APK
    sendLog(clientId, "🛠 Processing APK...", "info")
    const modifiedBuffer = await processAPK(buffer, mode, clientId)

    // Upload to storage
    sendLog(clientId, "📤 Uploading modified APK...", "info")
    const outputFilename = `${file.name.replace('.apk', '')}_premium.apk`
    const uploadPath = `${clientId}/${outputFilename}`
    const data = await uploadFile("apk-files", uploadPath, modifiedBuffer)

    // Create conversion record
    await createConversion({
      session_id: clientId,
      original_filename: file.name,
      converted_filename: outputFilename,
      conversion_mode: mode as "debug" | "sandbox" | "combined",
      status: "completed",
      file_size: file.size,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    })

    sendLog(clientId, `✅ Conversion successful: ${outputFilename}`, "success")
    return NextResponse.json({
      success: true,
      downloadUrl: `/api/download/${clientId}/${outputFilename}`,
      filename: outputFilename,
      sessionId: clientId
    })

  } catch (error) {
    sendLog(clientId, `❌ Conversion failed: ${error}`, "error")
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
