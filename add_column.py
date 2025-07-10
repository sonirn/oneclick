#!/usr/bin/env python3
"""
Add missing error_message column to generated_videos table
"""
import psycopg2
import os

DATABASE_URL = "postgres://neondb_owner:npg_2RNt5IwBXShV@ep-muddy-cell-a4gezv5f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

def add_missing_column():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Add missing error_message column
        cur.execute("""
            ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS error_message TEXT;
        """)
        
        conn.commit()
        print("✅ Successfully added error_message column to generated_videos table")
        
    except Exception as e:
        print(f"❌ Error adding column: {e}")
        if conn:
            conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    add_missing_column()