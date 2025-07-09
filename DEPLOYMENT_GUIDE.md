# 🚀 Vercel Deployment Guide

## 📋 Environment Variables Required

Add these environment variables in your Vercel dashboard:

### 🗄️ Database Configuration
```
DATABASE_URL=your_neon_postgresql_url
POSTGRES_URL=your_neon_postgresql_url
POSTGRES_PRISMA_URL=your_neon_postgresql_url
POSTGRES_URL_NON_POOLING=your_neon_postgresql_url
```

### 🔐 Supabase Authentication
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### ☁️ Cloudflare R2 Storage
```
CLOUDFLARE_R2_ACCOUNT_ID=your_cloudflare_r2_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_cloudflare_r2_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_cloudflare_r2_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=your_r2_public_url
```

### 🤖 AI Service API Keys
```
# Primary Gemini API Keys (Multiple for Rate Limiting)
GEMINI_API_KEY=AIzaSyBwVEDRvZ2bHppZj2zN4opMqxjzcxpJCDk
GEMINI_API_KEY_2=AIzaSyB-VMWQe_Bvx6j_iixXTVGRB0fx0RpQSLU
GEMINI_API_KEY_3=AIzaSyD36dRBkEZUyCpDHLxTVuMO4P98SsYjkbc

# Other AI Services
GROQ_API_KEY=your_groq_api_key
RUNWAY_API_KEY=your_runway_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
XAI_API_KEY=your_xai_api_key
```

### 🗃️ Redis Configuration (Optional - for background jobs)
```
REDIS_URL=your_redis_url
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port
REDIS_PASSWORD=your_redis_password
```

### 🔧 Application Configuration
```
NODE_ENV=production
NEXTAUTH_URL=your_production_url
NEXTAUTH_SECRET=your_nextauth_secret
```

### 📊 Rate Limiting Configuration
```
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_FAILED_REQUESTS=true
```

### 🔒 Security Configuration
```
CORS_ORIGIN=your_frontend_url
API_SECRET_KEY=your_api_secret_key
WEBHOOK_SECRET=your_webhook_secret
```

### 📝 Logging Configuration
```
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

## 🚀 Deployment Steps

### 1. Connect Repository
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Click "New Project"
- Connect your GitHub repository

### 2. Configure Build Settings
- **Framework Preset**: Next.js
- **Node.js Version**: 18.x or higher
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. Add Environment Variables
- Go to Project Settings > Environment Variables
- Add all the environment variables listed above
- Make sure to set them for all environments (Production, Preview, Development)

### 4. Configure Domains
- Add your custom domain in the Domains section
- Set up SSL/TLS certificates (automatic with Vercel)

### 5. Deploy
- Click "Deploy"
- Monitor the build logs for any errors
- Access your deployed application

## 🔍 Post-Deployment Verification

### 1. Test API Endpoints
```bash
# Test status endpoint
curl https://your-domain.vercel.app/api/status

# Test AI status
curl https://your-domain.vercel.app/api/ai-status

# Test rate limiting status
curl https://your-domain.vercel.app/api/rate-limit-status
```

### 2. Monitor Rate Limiting
- Check the rate limiting dashboard at `/api/rate-limit-status`
- Monitor API key usage across multiple Gemini keys
- Verify load balancing is working properly

### 3. Test Video Analysis
- Upload a sample video
- Verify the analysis completes successfully
- Check that multiple API keys are being used

### 4. Performance Monitoring
- Monitor serverless function execution times
- Check memory usage for API endpoints
- Verify database connections are stable

## 🛠️ Troubleshooting

### Common Issues:

1. **Build Errors**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check TypeScript errors

2. **API Timeout Issues**
   - Increase serverless function timeout in vercel.json
   - Implement better error handling
   - Check API key validity

3. **Database Connection Issues**
   - Verify PostgreSQL connection string
   - Check database permissions
   - Ensure database is accessible from Vercel

4. **Rate Limiting Problems**
   - Check API key rotation is working
   - Monitor queue processing
   - Verify rate limiting configuration

## 📈 Performance Optimization

### 1. Enable Caching
```javascript
// In API routes
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Choose region closest to your users
}
```

### 2. Optimize Database Queries
- Use connection pooling
- Implement query caching
- Optimize slow queries

### 3. Monitor API Usage
- Track API call patterns
- Implement usage analytics
- Set up alerts for quota limits

### 4. Scale Configuration
- Monitor concurrent request limits
- Implement queue management
- Set up auto-scaling policies

## 🔐 Security Considerations

### 1. Environment Variables
- Never commit API keys to version control
- Use Vercel's environment variable encryption
- Rotate API keys regularly

### 2. Rate Limiting
- Implement per-user rate limiting
- Monitor suspicious activity
- Set up abuse detection

### 3. Input Validation
- Validate all user inputs
- Sanitize file uploads
- Implement CSRF protection

### 4. CORS Configuration
- Set proper CORS headers
- Restrict API access to authorized domains
- Implement proper authentication

## 📞 Support

For deployment issues:
1. Check Vercel build logs
2. Review the troubleshooting section
3. Monitor rate limiting dashboard
4. Check API key status and usage

## 🎯 Production Checklist

- [ ] All environment variables configured
- [ ] API keys tested and working
- [ ] Rate limiting implemented and tested
- [ ] Database connection stable
- [ ] File uploads working
- [ ] AI services responding correctly
- [ ] Performance monitoring set up
- [ ] Security headers configured
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Backup and recovery plan in place