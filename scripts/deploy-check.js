#!/usr/bin/env node

/**
 * Pre-deployment check script
 * Verifies all required environment variables and configurations
 */

const fs = require('fs');
const path = require('path');

// Required environment variables
const requiredEnvVars = [
  // Database
  'DATABASE_URL',
  'POSTGRES_URL',
  
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  
  // Cloudflare R2
  'CLOUDFLARE_R2_ACCOUNT_ID',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'CLOUDFLARE_R2_BUCKET_NAME',
  'CLOUDFLARE_R2_PUBLIC_URL',
  
  // AI Services
  'GEMINI_API_KEY',
  'RUNWAY_API_KEY',
  'ELEVENLABS_API_KEY',
  'GROQ_API_KEY',
  
  // Application
  'NODE_ENV',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET'
];

// Optional environment variables
const optionalEnvVars = [
  'GEMINI_API_KEY_2',
  'GEMINI_API_KEY_3',
  'REDIS_URL',
  'XAI_API_KEY',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'LOG_LEVEL',
  'API_SECRET_KEY',
  'WEBHOOK_SECRET'
];

// Check if required files exist
const requiredFiles = [
  'package.json',
  'next.config.js',
  'vercel.json',
  '.env.example',
  'tsconfig.json'
];

function checkEnvironmentVariables() {
  console.log('🔍 Checking Environment Variables...\n');
  
  let missingRequired = [];
  let missingOptional = [];
  
  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingRequired.push(varName);
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });
  
  // Check optional variables
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });
  
  if (missingRequired.length > 0) {
    console.log(`\n❌ Missing required environment variables:`);
    missingRequired.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    return false;
  }
  
  if (missingOptional.length > 0) {
    console.log(`\n⚠️  Missing optional environment variables:`);
    missingOptional.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }
  
  return true;
}

function checkRequiredFiles() {
  console.log('\n📁 Checking Required Files...\n');
  
  let missingFiles = [];
  
  requiredFiles.forEach(fileName => {
    const filePath = path.join(process.cwd(), fileName);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${fileName}: Found`);
    } else {
      missingFiles.push(fileName);
      console.log(`❌ ${fileName}: Missing`);
    }
  });
  
  return missingFiles.length === 0;
}

function checkPackageJson() {
  console.log('\n📦 Checking Package.json...\n');
  
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check Node.js version
    if (packageJson.engines && packageJson.engines.node) {
      console.log(`✅ Node.js version specified: ${packageJson.engines.node}`);
    } else {
      console.log(`⚠️  Node.js version not specified in engines`);
    }
    
    // Check build script
    if (packageJson.scripts && packageJson.scripts.build) {
      console.log(`✅ Build script: ${packageJson.scripts.build}`);
    } else {
      console.log(`❌ Build script missing`);
      return false;
    }
    
    // Check vercel-build script
    if (packageJson.scripts && packageJson.scripts['vercel-build']) {
      console.log(`✅ Vercel build script: ${packageJson.scripts['vercel-build']}`);
    } else {
      console.log(`⚠️  Vercel build script not found (optional)`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

function checkNextConfig() {
  console.log('\n⚙️  Checking Next.js Configuration...\n');
  
  try {
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    const nextConfig = require(nextConfigPath);
    
    // Check if it's properly configured
    if (nextConfig.output) {
      console.log(`✅ Output mode: ${nextConfig.output}`);
    }
    
    if (nextConfig.images && nextConfig.images.domains) {
      console.log(`✅ Image domains configured: ${nextConfig.images.domains.join(', ')}`);
    }
    
    if (nextConfig.api && nextConfig.api.bodyParser) {
      console.log(`✅ API body parser configured`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error reading next.config.js: ${error.message}`);
    return false;
  }
}

function checkVercelConfig() {
  console.log('\n🔧 Checking Vercel Configuration...\n');
  
  try {
    const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    
    if (vercelConfig.functions) {
      console.log(`✅ Function configurations found`);
      Object.keys(vercelConfig.functions).forEach(func => {
        console.log(`   - ${func}: ${vercelConfig.functions[func].maxDuration}s timeout`);
      });
    }
    
    if (vercelConfig.headers) {
      console.log(`✅ Headers configured`);
    }
    
    if (vercelConfig.rewrites) {
      console.log(`✅ Rewrites configured`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Error reading vercel.json: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🚀 Pre-deployment Check for AI Video Generation Platform\n');
  console.log('='.repeat(60));
  
  let allChecksPass = true;
  
  // Run all checks
  allChecksPass = checkEnvironmentVariables() && allChecksPass;
  allChecksPass = checkRequiredFiles() && allChecksPass;
  allChecksPass = checkPackageJson() && allChecksPass;
  allChecksPass = checkNextConfig() && allChecksPass;
  allChecksPass = checkVercelConfig() && allChecksPass;
  
  console.log('\n' + '='.repeat(60));
  
  if (allChecksPass) {
    console.log('🎉 All checks passed! Ready for deployment to Vercel.');
    console.log('\nNext steps:');
    console.log('1. Push your code to GitHub');
    console.log('2. Connect the repository to Vercel');
    console.log('3. Add environment variables in Vercel dashboard');
    console.log('4. Deploy!');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. Please fix the issues above before deploying.');
    console.log('\nRefer to DEPLOYMENT_GUIDE.md for detailed instructions.');
    process.exit(1);
  }
}

// Run the checks
main();