#!/usr/bin/env python3
"""
Simple test to debug the video generation API directly
"""
import requests
import json
import psycopg2

DATABASE_URL = "postgres://neondb_owner:npg_2RNt5IwBXShV@ep-muddy-cell-a4gezv5f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
BACKEND_URL = "http://localhost:3000/api"

def test_video_generation_directly():
    """Test the exact JSON parsing issue"""
    
    # Test project already exists from previous test
    project_id = "550e8400-e29b-41d4-a716-446655440001"
    
    print(f"Testing video generation for project: {project_id}")
    
    # Make the request
    try:
        url = f"{BACKEND_URL}/generate-video"
        payload = {
            "projectId": project_id
        }
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Video generation API working!")
        else:
            print(f"❌ Video generation API failed")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_video_generation_directly()