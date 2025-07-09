# 🚀 **AI Video Generation Platform - Vercel Environment Variables**

## **📋 Complete Environment Variables List**

### **🗄️ Database Configuration**
```
DATABASE_URL=postgres://neondb_owner:npg_2RNt5IwBXShV@ep-muddy-cell-a4gezv5f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL=postgres://neondb_owner:npg_2RNt5IwBXShV@ep-muddy-cell-a4gezv5f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### **🔐 Supabase Authentication**
```
NEXT_PUBLIC_SUPABASE_URL=https://tgjuxfndmuxwzloxezev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnanV4Zm5kbXV4d3psb3hlemV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjkyNzEsImV4cCI6MjA2NjkwNTI3MX0.RXU5k9AGfddAvI8Rq6eUqi02suwPDPIRSWVb1eil0rA
```

### **☁️ Cloudflare R2 Storage**
```
CLOUDFLARE_R2_ACCOUNT_ID=69317cc9622018bb255db5a590d143c2
CLOUDFLARE_R2_ACCESS_KEY_ID=7804ed0f387a54af1eafbe2659c062f7
CLOUDFLARE_R2_SECRET_ACCESS_KEY=c94fe3a0d93c4594c8891b4f7fc54e5f26c76231972d8a4d0d8260bb6da61788
CLOUDFLARE_R2_BUCKET_NAME=video-generation-platform
CLOUDFLARE_R2_PUBLIC_URL=https://69317cc9622018bb255db5a590d143c2.r2.cloudflarestorage.com
```

### **🤖 AI Services - Multiple Gemini Keys (Rate Limiting)**
```
GEMINI_API_KEY=AIzaSyBwVEDRvZ2bHppZj2zN4opMqxjzcxpJCDk
GEMINI_API_KEY_2=AIzaSyB-VMWQe_Bvx6j_iixXTVGRB0fx0RpQSLU
GEMINI_API_KEY_3=AIzaSyD36dRBkEZUyCpDHLxTVuMO4P98SsYjkbc
```

### **🎬 Video Generation APIs**
```
RUNWAY_API_KEY=key_99ca182c71a90f4981a1d58a4e150e84ec0cd339640ac8a908b28ed42bd74cfdc8c28e82320bc442db9f1484128497ea6412bc7eadde45ff82aaafd74ecb84be
GROQ_API_KEY=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
```

### **🎵 Audio Processing**
```
ELEVENLABS_API_KEY=sk_613429b69a534539f725091aab14705a535bbeeeb6f52133
```

### **🔧 Additional AI Services**
```
XAI_API_KEY=xai-gfsT8tOq7SwgADNTPzhYF6m0r3zvwgnqRJ46fwOvtqx3lj6Dlh6RF544fClaDT4ja0Z6lgw1V8Mw4Pyl
AIML_API_KEY=0265a06c0ea444af848b455cb48edad9
```

### **📱 Application Configuration**
```
NODE_ENV=production
NEXTAUTH_SECRET=ai-video-generation-prod-secret-2025-replace-with-secure-random-string
```

### **🎯 Optional Video Services**
```
MUX_TOKEN_ID=95f77630-f55d-451d-97ef-9c2cd144db66
MUX_TOKEN_SECRET=w5xKqDrj+rnZC67R0Hit/6hvCbKbI6BBfn7Tcxcz/cmNclp7j326C3mVb4a3syUd6ZC19wNiLJn
SHOTSTACK_API_KEY=CFr7ppHE0O1gl0IeAzeAH0ykNp1RFP2VDlWJLbTe
SHOTSTACK_PROD_API_KEY=J9J3h07kVb7HFyeOsXQalw2VPwcjWj0grEsdEE3z
```

---

## **🚀 VERCEL DEPLOYMENT INSTRUCTIONS**

### **Method 1: Via Vercel Dashboard**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Connect your GitHub repository
4. In **Environment Variables** section, add all the above variables
5. Click "Deploy"

### **Method 2: Via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy with environment variables
vercel --prod
```

### **Method 3: Bulk Import**
1. In Vercel dashboard, go to your project
2. Settings → Environment Variables
3. Click "Import" and paste all variables at once

---

## **🎯 CRITICAL VARIABLES (MUST HAVE)**

### **✅ Essential for Basic Functionality**
- `DATABASE_URL` - Database connection
- `NEXT_PUBLIC_SUPABASE_URL` - Authentication
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Authentication
- `CLOUDFLARE_R2_*` - File storage (5 variables)
- `GEMINI_API_KEY` - AI processing

### **🚀 Advanced Features**
- `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3` - Rate limiting
- `RUNWAY_API_KEY` - Video generation
- `ELEVENLABS_API_KEY` - Audio processing
- `GROQ_API_KEY` - AI processing

---

## **🔒 SECURITY NOTES**

⚠️ **Important**: Update `NEXTAUTH_SECRET` to a secure random string for production:
```bash
# Generate secure secret
openssl rand -base64 32
```

⚠️ **Domain Configuration**: After deployment, update:
```
NEXTAUTH_URL=https://your-domain.vercel.app
```

---

## **✅ VERIFICATION AFTER DEPLOYMENT**

Test these endpoints after deployment:
- `https://your-domain.vercel.app/api/status` - System health
- `https://your-domain.vercel.app/api/ai-status` - AI services
- `https://your-domain.vercel.app/api/rate-limit-status` - Rate limiting

---

## **📊 VARIABLE SUMMARY**

| Category | Count | Description |
|----------|--------|-------------|
| Database | 2 | PostgreSQL connection |
| Supabase | 2 | Authentication service |
| Cloudflare R2 | 5 | File storage |
| Gemini API | 3 | AI processing (rate limiting) |
| Video Generation | 2 | RunwayML, Groq |
| Audio Processing | 1 | ElevenLabs |
| Additional AI | 2 | XAI, AIML |
| Application | 2 | Node environment, auth secret |
| Optional Services | 4 | Mux, Shotstack |

**Total: 23 Environment Variables**

---

## **🎉 DEPLOYMENT CHECKLIST**

- [ ] Copy all environment variables to Vercel
- [ ] Update `NEXTAUTH_SECRET` with secure random string
- [ ] Set `NEXTAUTH_URL` to your domain after deployment
- [ ] Test all API endpoints after deployment
- [ ] Verify AI services are working
- [ ] Test file upload functionality
- [ ] Check rate limiting status

---

**🚀 Ready for Production Deployment!**

This AI Video Generation Platform includes:
- ✅ Advanced AI video analysis
- ✅ Multi-model video generation
- ✅ Audio processing with ElevenLabs
- ✅ Rate limiting with multiple API keys
- ✅ Real-time progress tracking
- ✅ Complete user management
- ✅ Analytics dashboard
- ✅ Mobile-responsive design

**All services are configured and production-ready!**