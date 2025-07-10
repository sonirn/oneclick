require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};

// Database Schema
const initDatabase = async () => {
  try {
    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Add missing columns if they don't exist
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);

    // Projects table
    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        sample_video_url VARCHAR(500),
        character_image_url VARCHAR(500),
        audio_file_url VARCHAR(500),
        analysis_result JSONB,
        generation_plan JSONB,
        status VARCHAR(50) DEFAULT 'created',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Generated Videos table
    await db.query(`
      CREATE TABLE IF NOT EXISTS generated_videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        video_url VARCHAR(500),
        thumbnail_url VARCHAR(500),
        duration INTEGER,
        file_size BIGINT,
        quality VARCHAR(50),
        aspect_ratio VARCHAR(20) DEFAULT '9:16',
        status VARCHAR(50) DEFAULT 'processing',
        ai_model_used VARCHAR(100),
        generation_params JSONB,
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Add missing columns to generated_videos table
    await db.query(`
      ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS error_message TEXT;
    `);

    // Processing Jobs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS processing_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        job_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        error_message TEXT,
        job_data JSONB,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_generated_videos_project_id ON generated_videos(project_id);
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_project_id ON processing_jobs(project_id);
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_generated_videos_expires_at ON generated_videos(expires_at);
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Run initialization
initDatabase().then(() => {
  console.log('Database setup completed!');
  process.exit(0);
}).catch(err => {
  console.error('Database setup failed:', err);
  process.exit(1);
});
