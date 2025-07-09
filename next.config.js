/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['supabase.co', 'r2.cloudflarestorage.com', 'storage.googleapis.com'],
  },
  // Vercel deployment optimizations
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
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
  // Configure trailing slash behavior
  trailingSlash: false,
};

module.exports = nextConfig;