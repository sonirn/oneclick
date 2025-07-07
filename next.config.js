/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['supabase.co', 'r2.cloudflarestorage.com'],
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  serverRuntimeConfig: {
    maxDuration: 300, // 5 minutes
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig