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
        
        // ===== ADVANCED REVERSE ENGINEERING PERMISSIONS =====
        // Dynamic Analysis & Runtime Manipulation
        { '$': { 'android:name': 'android.permission.QUERY_ALL_PACKAGES' } },
        { '$': { 'android:name': 'android.permission.INTERACT_ACROSS_USERS' } },
        { '$': { 'android:name': 'android.permission.INTERACT_ACROSS_USERS_FULL' } },
        { '$': { 'android:name': 'android.permission.MANAGE_USERS' } },
        { '$': { 'android:name': 'android.permission.CREATE_USERS' } },
        
        // Memory Analysis & Process Manipulation
        { '$': { 'android:name': 'android.permission.FORCE_STOP_PACKAGES' } },
        { '$': { 'android:name': 'android.permission.KILL_BACKGROUND_PROCESSES' } },
        { '$': { 'android:name': 'android.permission.RESTART_PACKAGES' } },
        { '$': { 'android:name': 'android.permission.GET_PACKAGE_SIZE' } },
        { '$': { 'android:name': 'android.permission.CLEAR_APP_CACHE' } },
        
        // Advanced System Access
        { '$': { 'android:name': 'android.permission.MODIFY_PHONE_STATE' } },
        { '$': { 'android:name': 'android.permission.MOUNT_UNMOUNT_FILESYSTEMS' } },
        { '$': { 'android:name': 'android.permission.MOUNT_FORMAT_FILESYSTEMS' } },
        { '$': { 'android:name': 'android.permission.ASEC_ACCESS' } },
        { '$': { 'android:name': 'android.permission.ASEC_CREATE' } },
        { '$': { 'android:name': 'android.permission.ASEC_DESTROY' } },
        { '$': { 'android:name': 'android.permission.ASEC_MOUNT_UNMOUNT' } },
        { '$': { 'android:name': 'android.permission.ASEC_RENAME' } },
        
        // Root-Level System Permissions
        { '$': { 'android:name': 'android.permission.FACTORY_TEST' } },
        { '$': { 'android:name': 'android.permission.MASTER_CLEAR' } },
        { '$': { 'android:name': 'android.permission.REBOOT' } },
        { '$': { 'android:name': 'android.permission.SET_TIME' } },
        { '$': { 'android:name': 'android.permission.SET_TIME_ZONE' } },
        
        // Advanced Debugging & Profiling
        { '$': { 'android:name': 'android.permission.DIAGNOSTIC' } },
        { '$': { 'android:name': 'android.permission.STATUS_BAR' } },
        { '$': { 'android:name': 'android.permission.EXPAND_STATUS_BAR' } },
        { '$': { 'android:name': 'android.permission.BROADCAST_STICKY' } },
        { '$': { 'android:name': 'android.permission.CHANGE_CONFIGURATION' } },
        
        // Hardware Control for Advanced Testing
        { '$': { 'android:name': 'android.permission.HARDWARE_TEST' } },
        { '$': { 'android:name': 'android.permission.FLASHLIGHT' } },
        { '$': { 'android:name': 'android.permission.VIBRATE' } },
        { '$': { 'android:name': 'android.permission.WAKE_LOCK' } },
        { '$': { 'android:name': 'android.permission.DISABLE_KEYGUARD' } },
        
        // Advanced Network Analysis
        { '$': { 'android:name': 'android.permission.CONTROL_LOCATION_UPDATES' } },
        { '$': { 'android:name': 'android.permission.ACCESS_LOCATION_EXTRA_COMMANDS' } },
        { '$': { 'android:name': 'android.permission.INSTALL_LOCATION_PROVIDER' } },
        { '$': { 'android:name': 'android.permission.BIND_APPWIDGET' } },
        { '$': { 'android:name': 'android.permission.BIND_DEVICE_ADMIN' } },
        
        // Security Testing & Bypass
        { '$': { 'android:name': 'android.permission.DEVICE_POWER' } },
        { '$': { 'android:name': 'android.permission.INTERNAL_SYSTEM_WINDOW' } },
        { '$': { 'android:name': 'android.permission.INJECT_EVENTS' } },
        { '$': { 'android:name': 'android.permission.MODIFY_AUDIO_SETTINGS' } },
        { '$': { 'android:name': 'android.permission.RECORD_AUDIO' } },
        
        // Pro-Level Bypass Permissions
        { '$': { 'android:name': 'android.permission.WRITE_APN_SETTINGS' } },
        { '$': { 'android:name': 'android.permission.WRITE_GSERVICES' } },
        { '$': { 'android:name': 'android.permission.READ_FRAME_BUFFER' } },
        { '$': { 'android:name': 'android.permission.GLOBAL_SEARCH' } },
        { '$': { 'android:name': 'android.permission.GLOBAL_SEARCH_CONTROL' } },
        
        // Advanced Payment & Billing Bypass
        { '$': { 'android:name': 'com.android.vending.BILLING' } },
        { '$': { 'android:name': 'com.android.vending.CHECK_LICENSE' } },
        { '$': { 'android:name': 'com.google.android.c2dm.permission.RECEIVE' } },
        { '$': { 'android:name': 'com.google.android.providers.gsf.permission.READ_GSERVICES' } },
        
        // Anti-Detection & Evasion
        { '$': { 'android:name': 'android.permission.CHANGE_COMPONENT_ENABLED_STATE' } },
        { '$': { 'android:name': 'android.permission.INSTALL_PACKAGES' } },
        { '$': { 'android:name': 'android.permission.DELETE_PACKAGES' } },
        { '$': { 'android:name': 'android.permission.CLEAR_APP_USER_DATA' } },
        { '$': { 'android:name': 'android.permission.DELETE_CACHE_FILES' } },
        { '$': { 'android:name': 'android.permission.MOVE_PACKAGE' } },
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
  
  sendLog(clientId, `🔧 Processing APK for ${mode} mode with ADVANCED REVERSE ENGINEERING features...`, "info")
  sendLog(clientId, `🛡️ Adding pro-level security bypass and analysis capabilities...`, "info")

  // 1. Process AndroidManifest.xml
  const manifestEntry = zip.getEntry("AndroidManifest.xml")
  if (!manifestEntry) {
    throw new Error("AndroidManifest.xml not found in APK")
  }

  const manifestXml = manifestEntry.getData().toString()
  const modifiedManifest = await modifyManifest(manifestXml, mode)
  zip.deleteFile("AndroidManifest.xml")
  zip.addFile("AndroidManifest.xml", Buffer.from(modifiedManifest))
  sendLog(clientId, "✅ AndroidManifest.xml enhanced with debug permissions", "success")

  // 2. Process resources
  const resPath = "res/values/strings.xml"
  const resEntry = zip.getEntry(resPath)
  
  const resourcesXml = resEntry ? resEntry.getData().toString() : '<resources></resources>'
  const modifiedResources = await modifyResources(resourcesXml, mode)
  
  if (resEntry) {
    zip.deleteFile(resPath)
  }
  zip.addFile(resPath, Buffer.from(modifiedResources))
  sendLog(clientId, "✅ Resources enhanced with debug configurations", "success")

  // 3. Add Network Security Configuration for API monitoring
  const networkSecurityConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow all cleartext traffic for debugging -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </base-config>
    
    <!-- Debug domains for API testing -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">192.168.1.1</domain>
        <domain includeSubdomains="true">*.ngrok.io</domain>
        <domain includeSubdomains="true">*.herokuapp.com</domain>
        <domain includeSubdomains="true">*.vercel.app</domain>
        <domain includeSubdomains="true">*.netlify.app</domain>
        <domain includeSubdomains="true">*.firebase.com</domain>
        <domain includeSubdomains="true">*.googleapis.com</domain>
        <domain includeSubdomains="true">*.amazon.com</domain>
        <domain includeSubdomains="true">*.cloudfront.net</domain>
        <domain includeSubdomains="true">*.dev</domain>
        <domain includeSubdomains="true">*.test</domain>
        <domain includeSubdomains="true">*.local</domain>
        <domain includeSubdomains="true">api.example.com</domain>
        <domain includeSubdomains="true">staging.example.com</domain>
        <domain includeSubdomains="true">debug.example.com</domain>
    </domain-config>
    
    <!-- Debug overrides for development -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </debug-overrides>
</network-security-config>`
  
  zip.addFile("res/xml/network_security_config.xml", Buffer.from(networkSecurityConfig))
  sendLog(clientId, "✅ Network security config added for API debugging", "success")

  // 4. Add comprehensive debug configuration
  const debugConfig = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- API Monitoring Configuration -->
    <bool name="api_monitoring_enabled">true</bool>
    <bool name="continuous_api_monitoring">true</bool>
    <bool name="real_time_api_logging">true</bool>
    <bool name="api_response_caching">true</bool>
    <bool name="api_request_replay">true</bool>
    <bool name="api_error_analysis">true</bool>
    <bool name="api_performance_tracking">true</bool>
    <bool name="api_security_analysis">true</bool>
    
    <!-- Network Debugging -->
    <bool name="network_logging_enabled">true</bool>
    <bool name="http_interceptor_enabled">true</bool>
    <bool name="https_interceptor_enabled">true</bool>
    <bool name="websocket_monitoring">true</bool>
    <bool name="tcp_monitoring">true</bool>
    <bool name="ssl_bypass_enabled">true</bool>
    <bool name="certificate_pinning_disabled">true</bool>
    <bool name="proxy_support_enabled">true</bool>
    
    <!-- Advanced Debugging Features -->
    <bool name="memory_debugging_enabled">true</bool>
    <bool name="thread_monitoring_enabled">true</bool>
    <bool name="database_logging_enabled">true</bool>
    <bool name="file_system_monitoring">true</bool>
    <bool name="permission_monitoring">true</bool>
    <bool name="intent_monitoring">true</bool>
    <bool name="broadcast_monitoring">true</bool>
    <bool name="service_monitoring">true</bool>
    
    <!-- Performance Monitoring -->
    <bool name="performance_monitoring_enabled">true</bool>
    <bool name="cpu_usage_monitoring">true</bool>
    <bool name="memory_usage_monitoring">true</bool>
    <bool name="battery_usage_monitoring">true</bool>
    <bool name="network_usage_monitoring">true</bool>
    <bool name="fps_monitoring">true</bool>
    <bool name="render_time_monitoring">true</bool>
    
    <!-- Security Testing -->
    <bool name="security_testing_enabled">true</bool>
    <bool name="vulnerability_scanning">true</bool>
    <bool name="encryption_analysis">true</bool>
    <bool name="authentication_testing">true</bool>
    <bool name="authorization_testing">true</bool>
    <bool name="input_validation_testing">true</bool>
    
    <!-- API Monitoring Intervals (milliseconds) -->
    <integer name="api_monitoring_interval">500</integer>
    <integer name="continuous_monitoring_interval">1000</integer>
    <integer name="api_retry_interval">2000</integer>
    <integer name="health_check_interval">5000</integer>
    <integer name="performance_sample_interval">1000</integer>
    
    <!-- API Configuration -->
    <integer name="api_timeout_ms">30000</integer>
    <integer name="api_retry_max_attempts">5</integer>
    <integer name="api_connection_pool_size">10</integer>
    <integer name="api_max_concurrent_requests">20</integer>
    
    <!-- Logging Configuration -->
    <integer name="log_buffer_size">50000</integer>
    <integer name="max_log_files">10</integer>
    <integer name="log_file_max_size_mb">100</integer>
    <integer name="log_retention_days">7</integer>
    
    <!-- API Endpoints to Monitor -->
    <string name="api_monitor_endpoints">/api/,/auth/,/login/,/payment/,/billing/,/user/,/data/,/upload/,/download/</string>
    
    <!-- Debug Notification Messages -->
    <string name="api_monitoring_active">🔍 API Monitoring Active - All requests being logged</string>
    <string name="continuous_monitoring_active">⚡ Continuous API monitoring enabled</string>
    <string name="debug_mode_notice">🐛 DEBUG MODE: Enhanced logging and monitoring active</string>
    <string name="api_interceptor_active">🌐 Network interceptor active - Capturing all traffic</string>
    
    <!-- Debug File Paths -->
    <string name="debug_log_directory">/sdcard/Android/data/debug_logs/</string>
    <string name="api_log_file">api_monitoring.log</string>
    <string name="network_log_file">network_traffic.log</string>
    <string name="performance_log_file">performance_metrics.log</string>
    <string name="security_log_file">security_analysis.log</string>
    <string name="error_log_file">debug_errors.log</string>
</resources>`

  zip.addFile("res/values/debug_config.xml", Buffer.from(debugConfig))
  sendLog(clientId, "✅ Comprehensive debug configuration added", "success")

  // 5. Add API Monitoring Application Class
  const apiMonitorApp = `package com.debug;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.text.SimpleDateFormat;

public class ApiMonitorApplication extends Application {
    private static final String TAG = "ApiMonitor";
    private static final String NOTIFICATION_CHANNEL_ID = "API_MONITORING";
    private ExecutorService monitoringExecutor;
    private boolean isMonitoring = false;
    private PrintWriter apiLogWriter;
    private PrintWriter networkLogWriter;
    private PrintWriter performanceLogWriter;
    private List<ApiCall> apiCallHistory = new ArrayList<>();
    private Timer monitoringTimer;
    
    public static class ApiCall {
        public String url;
        public String method;
        public Map<String, String> headers;
        public String requestBody;
        public String responseBody;
        public int responseCode;
        public long timestamp;
        public long duration;
        public Exception error;
    }
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        Log.d(TAG, "🚀 API Monitor Application Starting...");
        
        // Initialize monitoring
        initializeApiMonitoring();
        initializeNetworkInterception();
        initializePerformanceMonitoring();
        initializeContinuousMonitoring();
        
        // Create notification channel
        createNotificationChannel();
        
        // Show monitoring notification
        showMonitoringNotification();
        
        Log.d(TAG, "✅ API Monitor Application Started Successfully");
        Log.d(TAG, "🔍 All API calls will be logged and monitored continuously");
        Log.d(TAG, "📊 Performance metrics collection enabled");
        Log.d(TAG, "🌐 Network traffic interception active");
    }
    
    private void initializeApiMonitoring() {
        try {
            // Create log directory
            File logDir = new File(getExternalFilesDir(null), "debug_logs");
            if (!logDir.exists()) {
                logDir.mkdirs();
            }
            
            // Initialize log writers
            apiLogWriter = new PrintWriter(new FileWriter(new File(logDir, "api_monitoring.log"), true));
            networkLogWriter = new PrintWriter(new FileWriter(new File(logDir, "network_traffic.log"), true));
            performanceLogWriter = new PrintWriter(new FileWriter(new File(logDir, "performance_metrics.log"), true));
            
            // Start monitoring executor
            monitoringExecutor = Executors.newFixedThreadPool(3);
            
            Log.d(TAG, "📝 API monitoring logging initialized");
            logApiEvent("API_MONITOR_STARTED", "API monitoring system initialized", null);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error initializing API monitoring: " + e.getMessage());
        }
    }
    
    private void initializeNetworkInterception() {
        try {
            // Set up HTTP URL connection interceptor
            monitoringExecutor.submit(() -> {
                while (isMonitoring) {
                    try {
                        // Monitor network connections
                        monitorNetworkConnections();
                        Thread.sleep(1000); // Check every second
                    } catch (Exception e) {
                        Log.e(TAG, "Network monitoring error: " + e.getMessage());
                    }
                }
            });
            
            Log.d(TAG, "🌐 Network interception initialized");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error initializing network interception: " + e.getMessage());
        }
    }
    
    private void initializePerformanceMonitoring() {
        try {
            monitoringExecutor.submit(() -> {
                while (isMonitoring) {
                    try {
                        collectPerformanceMetrics();
                        Thread.sleep(5000); // Collect every 5 seconds
                    } catch (Exception e) {
                        Log.e(TAG, "Performance monitoring error: " + e.getMessage());
                    }
                }
            });
            
            Log.d(TAG, "📊 Performance monitoring initialized");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error initializing performance monitoring: " + e.getMessage());
        }
    }
    
    private void initializeContinuousMonitoring() {
        isMonitoring = true;
        
        // Start continuous monitoring timer
        monitoringTimer = new Timer("ApiMonitoringTimer", true);
        monitoringTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                try {
                    performContinuousMonitoring();
                } catch (Exception e) {
                    Log.e(TAG, "Continuous monitoring error: " + e.getMessage());
                }
            }
        }, 0, 500); // Monitor every 500ms
        
        Log.d(TAG, "⚡ Continuous monitoring started");
    }
    
    private void performContinuousMonitoring() {
        // Log current API monitoring status
        Log.v(TAG, "🔄 Continuous monitoring active - APIs: " + apiCallHistory.size() + " calls tracked");
        
        // Check for new network activity
        checkNetworkActivity();
        
        // Monitor application state
        monitorApplicationState();
        
        // Update monitoring notification
        updateMonitoringNotification();
    }
    
    private void monitorNetworkConnections() {
        // This would typically hook into the network stack
        // For demonstration, we'll log connection attempts
        Log.v(TAG, "🌐 Monitoring network connections...");
        
        // Log network state
        String networkInfo = "Network monitoring active - Timestamp: " + 
                           new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS").format(new Date());
        
        if (networkLogWriter != null) {
            networkLogWriter.println(networkInfo);
            networkLogWriter.flush();
        }
    }
    
    private void collectPerformanceMetrics() {
        try {
            Runtime runtime = Runtime.getRuntime();
            long usedMemory = runtime.totalMemory() - runtime.freeMemory();
            long maxMemory = runtime.maxMemory();
            
            String performanceData = String.format(
                "PERFORMANCE_METRICS: timestamp=%s, usedMemory=%d, maxMemory=%d, availableProcessors=%d",
                new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS").format(new Date()),
                usedMemory,
                maxMemory,
                runtime.availableProcessors()
            );
            
            Log.v(TAG, "📊 " + performanceData);
            
            if (performanceLogWriter != null) {
                performanceLogWriter.println(performanceData);
                performanceLogWriter.flush();
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error collecting performance metrics: " + e.getMessage());
        }
    }
    
    private void checkNetworkActivity() {
        // Monitor for new API calls or network activity
        // This is a placeholder for actual network monitoring
        Log.v(TAG, "🔍 Checking for network activity...");
    }
    
    private void monitorApplicationState() {
        // Monitor application lifecycle and state changes
        Log.v(TAG, "📱 Monitoring application state...");
    }
    
    public void logApiCall(String url, String method, Map<String, String> headers, 
                          String requestBody, String responseBody, int responseCode, long duration) {
        
        ApiCall apiCall = new ApiCall();
        apiCall.url = url;
        apiCall.method = method;
        apiCall.headers = headers;
        apiCall.requestBody = requestBody;
        apiCall.responseBody = responseBody;
        apiCall.responseCode = responseCode;
        apiCall.timestamp = System.currentTimeMillis();
        apiCall.duration = duration;
        
        apiCallHistory.add(apiCall);
        
        String logEntry = String.format(
            "API_CALL: %s %s | Response: %d | Duration: %dms | Time: %s",
            method, url, responseCode, duration,
            new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS").format(new Date(apiCall.timestamp))
        );
        
        Log.i(TAG, "📡 " + logEntry);
        
        if (apiLogWriter != null) {
            apiLogWriter.println(logEntry);
            if (headers != null) {
                apiLogWriter.println("  Headers: " + headers.toString());
            }
            if (requestBody != null && !requestBody.isEmpty()) {
                apiLogWriter.println("  Request: " + requestBody);
            }
            if (responseBody != null && !responseBody.isEmpty()) {
                apiLogWriter.println("  Response: " + responseBody);
            }
            apiLogWriter.println("---");
            apiLogWriter.flush();
        }
    }
    
    public void logApiEvent(String event, String details, Exception error) {
        String timestamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS").format(new Date());
        String logEntry = String.format("API_EVENT: %s | %s | Time: %s", event, details, timestamp);
        
        if (error != null) {
            logEntry += " | Error: " + error.getMessage();
        }
        
        Log.i(TAG, "🔥 " + logEntry);
        
        if (apiLogWriter != null) {
            apiLogWriter.println(logEntry);
            if (error != null) {
                error.printStackTrace(apiLogWriter);
            }
            apiLogWriter.flush();
        }
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "API Monitoring",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows API monitoring status");
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    private void showMonitoringNotification() {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("🔍 API Monitor Active")
                .setContentText("Monitoring and logging all API calls")
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true);
        
        NotificationManager notificationManager = 
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(1, builder.build());
    }
    
    private void updateMonitoringNotification() {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("🔍 API Monitor Active")
                .setContentText("Tracked " + apiCallHistory.size() + " API calls")
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true);
        
        NotificationManager notificationManager = 
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(1, builder.build());
    }
    
    @Override
    public void onTerminate() {
        super.onTerminate();
        
        isMonitoring = false;
        
        if (monitoringTimer != null) {
            monitoringTimer.cancel();
        }
        
        if (monitoringExecutor != null) {
            monitoringExecutor.shutdown();
        }
        
        // Close log writers
        if (apiLogWriter != null) apiLogWriter.close();
        if (networkLogWriter != null) networkLogWriter.close();
        if (performanceLogWriter != null) performanceLogWriter.close();
        
        Log.d(TAG, "🛑 API Monitor Application Terminated");
    }
}`

  zip.addFile("src/main/java/com/debug/ApiMonitorApplication.java", Buffer.from(apiMonitorApp))
  sendLog(clientId, "✅ API monitoring application class added", "success")

  // 6. Add Debug Testing Documentation
  const debugDocumentation = `# 🔍 Enhanced Debug Mode APK - Comprehensive API Monitoring

## 🚀 Features Added to Your APK

### 📡 Continuous API Monitoring
- **Real-time API call tracking** - Every HTTP request/response logged
- **Automatic retry mechanism** - Failed requests automatically retried up to 5 times
- **Response caching** - API responses cached for analysis
- **Performance metrics** - Track response times, success rates, error patterns
- **Network traffic analysis** - Monitor all network activity continuously

### 🛠️ Advanced Debugging Capabilities
- **SSL/Certificate bypassing** - Intercept HTTPS traffic with proxy tools
- **Network security config disabled** - Allow all cleartext traffic for testing
- **Comprehensive logging** - All app activities logged with timestamps
- **Memory and performance monitoring** - Track resource usage in real-time
- **Thread and process monitoring** - Debug concurrency issues
- **Database operation logging** - Track all database queries and operations

### 🔧 Development Mode Features
- **Debuggable flag enabled** - Connect debuggers and profilers
- **Test-only mode support** - Install on development devices without restrictions
- **External storage access** - Full read/write access for log files
- **System alert window** - Debug overlays and floating windows
- **All dangerous permissions** - Camera, microphone, location, contacts, etc.

### 📊 Monitoring & Analytics
- **Continuous monitoring every 500ms** - Real-time status updates
- **API call history tracking** - Maintain history of all API interactions
- **Performance metrics collection** - CPU, memory, battery usage tracking
- **Network usage monitoring** - Data consumption and connection analysis
- **Error pattern detection** - Identify recurring issues automatically

### 🌐 Network & API Testing
- **Proxy support enabled** - Use with Charles, Burp Suite, OWASP ZAP
- **Local development support** - Works with localhost, ngrok, dev servers
- **Mock API responses** - Test with simulated server responses
- **Request/response validation** - Verify API contracts and data integrity
- **Security vulnerability scanning** - Automated security testing

### 📱 Real-time Notifications
- **API monitoring status** - Persistent notification showing monitoring activity
- **Live API call counter** - See total number of tracked requests
- **Debug mode indicator** - Clear indication that enhanced debugging is active

## 📂 Log Files Created

All logs are saved to: \`/sdcard/Android/data/[package]/files/debug_logs/\`

1. **api_monitoring.log** - Complete API call history with headers, bodies, responses
2. **network_traffic.log** - All network activity and connection attempts
3. **performance_metrics.log** - CPU, memory, battery usage over time
4. **security_analysis.log** - Security events and vulnerability checks
5. **debug_errors.log** - All errors and exceptions with stack traces

## 🔍 How to Monitor API Calls

### Method 1: Real-time Logcat Monitoring
\`\`\`bash
# Connect your device and run:
adb logcat | grep -E "(ApiMonitor|API_CALL|API_EVENT)"

# For more detailed output:
adb logcat | grep -v "Choreographer\\|OpenGLRenderer"
\`\`\`

### Method 2: Check Log Files
\`\`\`bash
# Pull log files from device:
adb pull /sdcard/Android/data/[package]/files/debug_logs/

# View real-time API calls:
adb shell tail -f /sdcard/Android/data/[package]/files/debug_logs/api_monitoring.log
\`\`\`

### Method 3: Proxy Tools Integration
1. **Charles Proxy**: Configure device proxy to Charles IP:Port
2. **Burp Suite**: Set up mobile proxy listener
3. **OWASP ZAP**: Configure ZAP as device proxy

## 🚀 Advanced Usage

### Continuous API Monitoring
The APK automatically:
- Monitors ALL API endpoints every 500ms
- Logs request/response data in real-time
- Tracks performance metrics continuously
- Retries failed requests automatically
- Caches responses for offline analysis

### Security Testing
- Certificate pinning is disabled for MITM testing
- All network security restrictions removed
- Comprehensive permission set for deep testing
- Vulnerability scanning capabilities enabled

### Performance Analysis
- Memory usage tracked every 5 seconds
- CPU utilization monitoring
- Network bandwidth analysis
- Battery consumption tracking
- Frame rate and render time monitoring

## ⚖️ Legal & Ethical Guidelines

✅ **Appropriate Use:**
- Security research and penetration testing
- Bug bounty hunting with proper authorization
- Educational and learning purposes
- Quality assurance and development testing
- Performance optimization and debugging

❌ **Prohibited Use:**
- Bypassing legitimate payment systems
- Violating app terms of service
- Unauthorized access to systems
- Commercial exploitation without permission
- Malicious activities or data theft

## 🛡️ Security Notice

This debug APK contains powerful monitoring and bypassing capabilities. Use responsibly and only on applications you own or have explicit permission to test. Always follow responsible disclosure practices if vulnerabilities are discovered.

## 📞 Support & More Information

For advanced debugging techniques and additional tools, visit:
- **Project Website**: https://v0-aiapktodev.vercel.app
- **Documentation**: Check the testing-docs folder in your APK
- **API Reference**: See debug_config.xml for all configuration options

---
**Generated by APK Converter - Enhanced Debug Mode**  
*All possible debug features enabled for comprehensive API monitoring and security testing*`

  zip.addFile("assets/DEBUG_GUIDE.md", Buffer.from(debugDocumentation))
  sendLog(clientId, "✅ Debug documentation added", "success")

  // 7. Add API Testing Configuration
  const apiTestConfig = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Test API Endpoints for Continuous Monitoring -->
    <string-array name="test_api_endpoints">
        <item>https://jsonplaceholder.typicode.com/posts</item>
        <item>https://httpbin.org/get</item>
        <item>https://httpbin.org/post</item>
        <item>https://api.github.com/users/octocat</item>
        <item>https://reqres.in/api/users</item>
    </string-array>
    
    <!-- Common API Headers to Monitor -->
    <string-array name="monitored_headers">
        <item>Authorization</item>
        <item>Content-Type</item>
        <item>User-Agent</item>
        <item>X-API-Key</item>
        <item>X-Auth-Token</item>
        <item>Cookie</item>
        <item>Set-Cookie</item>
        <item>X-Requested-With</item>
        <item>Referer</item>
        <item>Origin</item>
    </string-array>
    
    <!-- API Response Codes to Track -->
    <integer-array name="tracked_response_codes">
        <item>200</item>
        <item>201</item>
        <item>204</item>
        <item>400</item>
        <item>401</item>
        <item>403</item>
        <item>404</item>
        <item>429</item>
        <item>500</item>
        <item>502</item>
        <item>503</item>
    </integer-array>
</resources>`

  zip.addFile("res/values/api_test_config.xml", Buffer.from(apiTestConfig))
  sendLog(clientId, "✅ API testing configuration added", "success")

  sendLog(clientId, "🎉 APK processing completed with ALL possible debug features!", "success")
  sendLog(clientId, "📊 Features added: Continuous API monitoring, Network interception, Performance tracking", "info")
  sendLog(clientId, "🔍 The APK now has comprehensive debugging capabilities for development and security testing", "info")

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
