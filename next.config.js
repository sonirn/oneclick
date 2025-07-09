/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['supabase.co', 'r2.cloudflarestorage.com', 'storage.googleapis.com'],
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
  },
  // Vercel deployment optimizations
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Enable compression for better performance
  compress: true,
  // Production optimizations
  swcMinify: true,
  // Configure headers for better security and performance
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  // Vercel serverless function configuration
  serverRuntimeConfig: {
    maxDuration: 300, // 5 minutes for serverless functions
  },
  // Configure rewrites for better routing
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // Configure redirects if needed
  async redirects() {
    return [];
  },
  // Output configuration for Vercel
  output: 'standalone',
  // Webpack configuration for bundle optimization
  webpack: (config, { isServer }) => {
    // Optimize for serverless deployment
    if (isServer) {
      config.externals = [...config.externals, 'bull', 'redis'];
    }
    return config;
  },
  // Disable x-powered-by header for security
  poweredByHeader: false,
  // Enable gzip compression
  compress: true,
  // Configure trailing slash behavior
  trailingSlash: false,
  // Configure static file serving
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
};

module.exports = nextConfig;