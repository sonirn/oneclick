# 🎬 AI Video Generation Platform

A comprehensive Next.js application for AI-powered video generation with advanced rate limiting, multiple AI model integration, and production-ready deployment.

## 🚀 Features

### ✨ Core Features
- **AI Video Analysis**: Analyze uploaded videos using multiple Gemini API keys
- **Intelligent Plan Generation**: Create detailed video generation plans
- **Multi-AI Model Support**: RunwayML Gen-4/Gen-3, Google Veo 2/3, ElevenLabs
- **Advanced Rate Limiting**: Load-balanced API key rotation with exponential backoff
- **Real-time Progress Tracking**: Monitor generation progress with WebSocket updates
- **Background Job Processing**: Redis/Bull queue system for heavy operations
- **Production-Ready**: Optimized for Vercel deployment with proper error handling

### 🛡️ Enhanced Rate Limiting
- **Multiple API Key Support**: Rotate between multiple Gemini API keys
- **Intelligent Load Balancing**: Distribute requests across available keys
- **Exponential Backoff**: Smart retry logic with increasing delays
- **Request Queuing**: Priority-based request queue management
- **Real-time Monitoring**: Live status dashboard for all API services
- **Automatic Recovery**: Self-healing rate limit management

### 🤖 AI Services Integration
- **Gemini API**: Multiple keys for video analysis and plan generation
- **RunwayML**: Gen-4 Turbo and Gen-3 Alpha for video generation
- **Google Veo**: Veo 2 and Veo 3 for advanced video creation
- **ElevenLabs**: Voice generation and audio processing
- **Groq**: Fast inference for real-time operations

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL (Neon), Redis
- **AI Services**: Gemini, RunwayML, ElevenLabs, Google Veo, Groq
- **Storage**: Cloudflare R2, Supabase
- **Deployment**: Vercel (Serverless Functions)

### Rate Limiting System
```
┌─────────────────────────────────────────────────────────────┐
│                Rate Limiting Service                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Gemini Key 1│  │ Gemini Key 2│  │ Gemini Key 3│         │
│  │ Status: OK  │  │ Status: OK  │  │ Status: COOL│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Request     │  │ Load        │  │ Exponential │         │
│  │ Queue       │  │ Balancer    │  │ Backoff     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 🚦 API Endpoints

### Core APIs
- `POST /api/analyze` - Video analysis with rate limiting
- `POST /api/generate-plan` - Plan generation with load balancing
- `POST /api/chat` - Interactive chat with AI about plans
- `POST /api/generate-video` - Video generation with multiple models
- `GET /api/rate-limit-status` - Real-time rate limiting status

### Monitoring
- `GET /api/status` - System health check
- `GET /api/ai-status` - AI service status check
- `GET /api/rate-limit-status` - Rate limiting dashboard

## 📊 Rate Limiting Configuration

### Gemini API (Multiple Keys)
```javascript
{
  maxRequests: 15,      // Per key per minute
  windowMs: 60000,      // 1 minute window
  cooldownMs: 30000,    // 30 second cooldown
  retryAttempts: 3,     // Max retry attempts
  backoffMultiplier: 2  // Exponential backoff
}
```

### Other Services
- **RunwayML**: 10 requests/minute, 60s cooldown
- **ElevenLabs**: 20 requests/minute, 30s cooldown
- **Groq**: 30 requests/minute, 20s cooldown

## 🚀 Deployment

### Quick Deploy to Vercel

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd ai-video-generation-platform
   npm install
   ```

2. **Run Deployment Check**
   ```bash
   node scripts/deploy-check.js
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

### Environment Variables

Add these to your Vercel project:

```bash
# Database
DATABASE_URL=your_neon_postgresql_url
POSTGRES_URL=your_neon_postgresql_url

# Multiple Gemini API Keys
GEMINI_API_KEY=AIzaSyBwVEDRvZ2bHppZj2zN4opMqxjzcxpJCDk
GEMINI_API_KEY_2=AIzaSyB-VMWQe_Bvx6j_iixXTVGRB0fx0RpQSLU
GEMINI_API_KEY_3=AIzaSyD36dRBkEZUyCpDHLxTVuMO4P98SsYjkbc

# Other AI Services
RUNWAY_API_KEY=your_runway_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
GROQ_API_KEY=your_groq_api_key

# Authentication
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Storage
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=your_public_url

# Application
NODE_ENV=production
NEXTAUTH_URL=your_production_url
NEXTAUTH_SECRET=your_secret
```

## 🔧 Development

### Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type checking
npm run type-check

# Check deployment readiness
node scripts/deploy-check.js
```

### Testing Rate Limiting
```bash
# Check rate limiting status
curl http://localhost:3000/api/rate-limit-status

# Test AI services
curl http://localhost:3000/api/ai-status

# Monitor system status
curl http://localhost:3000/api/status
```

## 📈 Monitoring

### Rate Limiting Dashboard
Access the rate limiting dashboard at `/api/rate-limit-status` to monitor:
- API key usage across all services
- Request queue lengths
- Cooldown periods
- Error rates
- Load balancing efficiency

### Key Metrics
- **API Key Health**: Status of each API key
- **Request Distribution**: Load balancing across keys
- **Queue Processing**: Background job status
- **Error Recovery**: Automatic retry success rates

## 🛠️ Advanced Features

### Intelligent API Key Management
- **Round-robin Distribution**: Evenly distribute requests
- **Health Monitoring**: Track key performance and availability
- **Automatic Failover**: Switch to healthy keys when needed
- **Usage Analytics**: Monitor consumption patterns

### Request Prioritization
- **High Priority**: Critical operations (video analysis)
- **Medium Priority**: Standard operations (chat)
- **Low Priority**: Background tasks (plan updates)

### Error Handling
- **Graceful Degradation**: Fallback to available services
- **Detailed Logging**: Comprehensive error tracking
- **User Feedback**: Clear error messages to users
- **Automatic Recovery**: Self-healing capabilities

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [API Documentation](docs/API.md) - Detailed API reference
- [Rate Limiting Guide](docs/RATE_LIMITING.md) - Rate limiting configuration
- [Development Setup](docs/DEVELOPMENT.md) - Local development guide

## 🎯 Production Checklist

- [ ] Multiple Gemini API keys configured
- [ ] Rate limiting tested and working
- [ ] All AI services authenticated
- [ ] Database connection stable
- [ ] File upload/storage working
- [ ] Vercel deployment successful
- [ ] Environment variables set
- [ ] Monitoring dashboards active
- [ ] SSL certificate installed
- [ ] Performance optimized

## 🔒 Security Features

- **API Key Rotation**: Automatic key cycling
- **Rate Limiting**: Prevent abuse and quota exhaustion
- **Input Validation**: Sanitize all user inputs
- **CORS Configuration**: Proper cross-origin settings
- **Environment Security**: Encrypted environment variables

## 💡 Tips for Production

1. **Monitor API Usage**: Keep track of quota consumption
2. **Scale API Keys**: Add more keys as usage grows
3. **Optimize Caching**: Implement response caching where appropriate
4. **Error Monitoring**: Set up alerts for critical failures
5. **Performance Testing**: Load test before major releases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests and checks
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for the AI video generation community. Ready for production deployment on Vercel with advanced rate limiting and multi-AI model support.