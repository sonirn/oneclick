# AI Video Generation Platform

A comprehensive video generation platform built with Next.js that uses multiple AI models to create similar videos based on user-uploaded samples.

## 🚀 Features

- **Smart Video Analysis**: AI analyzes sample videos to understand content, style, and structure
- **Multiple AI Models**: Integration with RunwayML, Google Veo, Groq, XAI, and more
- **Interactive Planning**: Users can chat and modify AI-generated video plans
- **Background Processing**: Video generation continues even if users leave the website
- **7-Day Access**: Generated videos are accessible for 7 days
- **Mobile-First Design**: Fully responsive and optimized for mobile devices
- **High-Quality Output**: No watermarks, 9:16 aspect ratio, up to 60 seconds

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Database**: Neon PostgreSQL
- **Storage**: Cloudflare R2
- **Authentication**: Supabase
- **AI Services**: 
  - Video Generation: RunwayML Gen-4, Google Veo 2/3
  - Audio: ElevenLabs, MMAudio
  - Chat/Analysis: Groq, XAI, Claude, Gemini
  - Video Editing: Shotstack, Mux

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│   Neon DB       │    │  Cloudflare R2  │
│   (Frontend +   │    │   (PostgreSQL)  │    │   (File Storage)│
│    API Routes)  │    └─────────────────┘    └─────────────────┘
└─────────────────┘              │                      │
        │                        │                      │
        ├────────────────────────┼──────────────────────┤
        │                        │                      │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   AI Services   │    │ Background Jobs │
│   (Auth)        │    │   (Video/Audio/ │    │   (Processing)  │
│                 │    │    Chat APIs)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Database Schema

### Users
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `name` (String)
- `created_at`, `updated_at` (Timestamps)

### Projects
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `title`, `description` (String)
- `sample_video_url`, `character_image_url`, `audio_file_url` (String)
- `analysis_result`, `generation_plan` (JSONB)
- `status` (String)
- `created_at`, `updated_at` (Timestamps)

### Generated Videos
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key)
- `video_url`, `thumbnail_url` (String)
- `duration`, `file_size` (Integer)
- `quality`, `aspect_ratio`, `ai_model_used` (String)
- `status` (String)
- `expires_at` (Timestamp - 7 days from creation)
- `created_at`, `updated_at` (Timestamps)

### Processing Jobs
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key)
- `job_type`, `status` (String)
- `progress` (Integer)
- `error_message` (Text)
- `job_data` (JSONB)
- `started_at`, `completed_at` (Timestamps)

## 🚦 API Endpoints

### Core APIs
- `GET /api/status` - System health check
- `GET /api/ai-status` - AI services status
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `DELETE /api/projects/[id]` - Delete project
- `GET /api/upload` - Get signed upload URL
- `POST /api/upload` - Upload files to R2

### Coming in Phase 2
- `POST /api/analyze` - Analyze video content
- `POST /api/generate-plan` - Generate video plan
- `POST /api/chat` - Chat with AI about plan
- `POST /api/generate-video` - Start video generation
- `GET /api/jobs/[id]` - Check processing status

## 🔧 Environment Variables

```env
# Database
DATABASE_URL="postgres://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."

# Cloudflare R2
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
R2_ENDPOINT="..."

# AI APIs
GROQ_API_KEY="..."
XAI_API_KEY="..."
GEMINI_API_KEY="..."
RUNWAY_API_KEY="..."
ELEVENLABS_API_KEY="..."
# ... more AI service keys
```

## 🚀 Getting Started

1. **Clone and Install**
```bash
git clone <repository>
cd video-generation-platform
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
# Add your API keys and configuration
```

3. **Database Setup**
```bash
# Database tables are auto-created on first API call
# Check http://localhost:3001/api/status for health
```

4. **Start Development**
```bash
npm run dev
# App runs on http://localhost:3001
```

## 📱 Mobile-First Design

The application is designed mobile-first with:
- Responsive layouts for all screen sizes
- Touch-friendly file upload areas
- Optimized forms and navigation
- Progressive Web App capabilities (coming soon)

## 🔄 Processing Workflow

1. **Upload**: User uploads sample video, character image, and audio
2. **Analysis**: AI analyzes video content, style, and structure
3. **Planning**: AI generates detailed video creation plan
4. **Chat**: User can discuss and modify the plan via chat
5. **Generation**: Multiple AI models create video segments
6. **Composition**: Videos are combined with effects and audio
7. **Delivery**: Final video is available for 7-day download

## 🎯 Current Status (Phase 1 Complete)

✅ **Infrastructure Setup**
- Next.js 14 application with TypeScript
- Neon PostgreSQL database with schema
- Cloudflare R2 file storage
- Supabase authentication
- Mobile-responsive UI

✅ **Core Components**
- Authentication system (sign up/sign in)
- Project creation interface
- File upload system (video, image, audio)
- Project management dashboard
- API routes for CRUD operations

✅ **Service Integrations**
- Database connection verified
- R2 storage working
- Supabase auth configured
- AI service APIs tested

## 🚧 Coming Next (Phase 2)

- Video analysis with AI models
- Plan generation and chat interface
- Real-time progress tracking
- Background job processing

## 📊 System Status

Check system health at:
- `/api/status` - Core services (DB, Storage, Auth)
- `/api/ai-status` - AI service connectivity

## 🤝 Contributing

This is a comprehensive video generation platform with multiple moving parts. Each component has been carefully designed for scalability and reliability.

---

**Made with ❤️ using Next.js, AI, and lots of coffee ☕**