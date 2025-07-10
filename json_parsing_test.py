#!/usr/bin/env python3
"""
Direct test for JSON parsing fixes by inserting mock data and testing the APIs
"""

import requests
import json
import psycopg2
import os
from urllib.parse import urlparse

# Database connection
DATABASE_URL = "postgres://neondb_owner:npg_2RNt5IwBXShV@ep-muddy-cell-a4gezv5f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
BACKEND_URL = "http://localhost:3000/api"

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL)

def setup_test_data():
    """Setup test data with JSON strings in database to test parsing"""
    print("Setting up test data with JSON strings...")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Create test user
        user_id = "550e8400-e29b-41d4-a716-446655440000"
        cur.execute("""
            INSERT INTO users (id, email, name) 
            VALUES (%s, %s, %s) 
            ON CONFLICT (id) DO NOTHING
        """, (user_id, "test@example.com", "Test User"))
        
        # Create test project with JSON strings (not JSONB objects)
        project_id = "550e8400-e29b-41d4-a716-446655440001"
        
        # Mock analysis result as JSON string (this is how it's stored in DB)
        analysis_result_json = json.dumps({
            "visual_style": "Modern and dynamic",
            "content_analysis": {
                "main_subjects": ["product", "branding"],
                "color_palette": ["blue", "white", "gray"],
                "mood": "professional"
            },
            "technical_details": {
                "duration": 45,
                "resolution": "1920x1080",
                "fps": 30
            },
            "recommendations": {
                "target_duration": 30,
                "suggested_style": "upbeat and engaging"
            }
        })
        
        # Mock generation plan as JSON string (this is how it's stored in DB)
        generation_plan_json = json.dumps({
            "plan_summary": "Test promotional video",
            "total_duration": 30,
            "segments": [
                {
                    "segment_number": 1,
                    "duration": 15,
                    "description": "Opening scene",
                    "visual_style": "Bright and dynamic",
                    "ai_model": "runway-gen4",
                    "prompt": "A vibrant opening scene",
                    "text_overlay": "Welcome",
                    "audio_notes": "Upbeat music"
                },
                {
                    "segment_number": 2,
                    "duration": 15,
                    "description": "Closing scene",
                    "visual_style": "Professional",
                    "ai_model": "google-veo-3",
                    "prompt": "Professional closing",
                    "text_overlay": "Thank You",
                    "audio_notes": "Fade out"
                }
            ],
            "transitions": [
                {
                    "between_segments": "1-2",
                    "type": "fade",
                    "description": "Smooth fade"
                }
            ],
            "audio_strategy": {
                "type": "generated",
                "description": "Upbeat background music",
                "voice_requirements": "Professional narrator",
                "background_music": "Upbeat electronic"
            }
        })
        
        # Insert project with JSON strings
        cur.execute("""
            INSERT INTO projects (id, user_id, title, description, sample_video_url, analysis_result, generation_plan, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                analysis_result = EXCLUDED.analysis_result,
                generation_plan = EXCLUDED.generation_plan,
                status = EXCLUDED.status
        """, (
            project_id,
            user_id,
            "JSON Parsing Test Project",
            "Testing JSON parsing fixes",
            "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            analysis_result_json,  # This is a JSON string
            generation_plan_json,  # This is a JSON string
            "plan_ready"
        ))
        
        conn.commit()
        print(f"✅ Test data created with project ID: {project_id}")
        return project_id
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error setting up test data: {e}")
        return None
    finally:
        cur.close()
        conn.close()

def test_plan_generation_json_parsing(project_id):
    """Test plan generation API - should parse analysis_result JSON string correctly"""
    print("\n🧪 Testing Plan Generation API (analysis_result JSON parsing)...")
    
    try:
        url = f"{BACKEND_URL}/generate-plan"
        payload = {
            "projectId": project_id,
            "userRequirements": "Make it more energetic with vibrant colors"
        }
        
        response = requests.post(url, json=payload, timeout=15)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            
            if success:
                print("✅ Plan generation API working - JSON parsing fix successful!")
                plan = result.get("plan", {})
                print(f"✅ Generated plan has {len(plan.get('segments', []))} segments")
                return True
            else:
                print(f"❌ Plan generation failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception in plan generation test: {e}")
        return False

def test_chat_interface_json_parsing(project_id):
    """Test chat interface API - should parse generation_plan JSON string correctly"""
    print("\n🧪 Testing Chat Interface API (generation_plan JSON parsing)...")
    
    try:
        url = f"{BACKEND_URL}/chat"
        payload = {
            "projectId": project_id,
            "message": "Can you make the video more dynamic?",
            "chatHistory": []
        }
        
        response = requests.post(url, json=payload, timeout=15)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            
            if success:
                print("✅ Chat interface API working - JSON parsing fix successful!")
                print(f"✅ Chat response received: {len(result.get('response', ''))} characters")
                return True
            else:
                print(f"❌ Chat interface failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception in chat interface test: {e}")
        return False

def test_video_generation_json_parsing(project_id):
    """Test video generation API - should parse generation_plan JSON string and access total_duration correctly"""
    print("\n🧪 Testing Video Generation API (generation_plan JSON parsing + total_duration access)...")
    
    try:
        # Create a test plan
        test_plan = {
            "plan_summary": "Test video for JSON parsing",
            "total_duration": 25,
            "segments": [
                {
                    "segment_number": 1,
                    "duration": 12,
                    "description": "Test opening",
                    "visual_style": "Dynamic",
                    "ai_model": "runway-gen4",
                    "prompt": "Test opening scene",
                    "text_overlay": "Hello",
                    "audio_notes": "Upbeat"
                },
                {
                    "segment_number": 2,
                    "duration": 13,
                    "description": "Test closing",
                    "visual_style": "Professional",
                    "ai_model": "google-veo-3",
                    "prompt": "Test closing scene",
                    "text_overlay": "Goodbye",
                    "audio_notes": "Fade"
                }
            ]
        }
        
        url = f"{BACKEND_URL}/generate-video"
        payload = {
            "projectId": project_id,
            "plan": test_plan
        }
        
        response = requests.post(url, json=payload, timeout=15)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            
            if success:
                print("✅ Video generation API working - JSON parsing fix successful!")
                print("✅ No 'Cannot read properties of undefined (reading 'total_duration')' error!")
                job_id = result.get("job_id")
                if job_id:
                    print(f"✅ Job started with ID: {job_id}")
                return True
            else:
                print(f"❌ Video generation failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception in video generation test: {e}")
        return False

def main():
    """Main test function"""
    print("=" * 80)
    print("TESTING JSON PARSING FIXES FOR VIDEO GENERATION WORKFLOW")
    print("=" * 80)
    print("This test verifies that the following fixes are working:")
    print("1. /app/app/api/generate-plan/route.ts - parsing analysis_result from DB")
    print("2. /app/app/api/chat/route.ts - parsing generation_plan from DB")
    print("3. /app/app/api/generate-video/route.ts - parsing generation_plan from DB")
    print("=" * 80)
    
    # Setup test data
    project_id = setup_test_data()
    if not project_id:
        print("❌ Failed to setup test data")
        return 1
    
    # Test each API endpoint
    results = []
    
    # Test 1: Plan Generation (analysis_result JSON parsing)
    results.append(test_plan_generation_json_parsing(project_id))
    
    # Test 2: Chat Interface (generation_plan JSON parsing)
    results.append(test_chat_interface_json_parsing(project_id))
    
    # Test 3: Video Generation (generation_plan JSON parsing + total_duration access)
    results.append(test_video_generation_json_parsing(project_id))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST RESULTS SUMMARY")
    print("=" * 80)
    
    test_names = [
        "Plan Generation API (analysis_result parsing)",
        "Chat Interface API (generation_plan parsing)",
        "Video Generation API (generation_plan parsing + total_duration)"
    ]
    
    all_passed = True
    for i, (test_name, result) in enumerate(zip(test_names, results)):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{i+1}. {test_name}: {status}")
        if not result:
            all_passed = False
    
    print("=" * 80)
    if all_passed:
        print("🎉 ALL JSON PARSING FIXES ARE WORKING CORRECTLY!")
        print("✅ The 'create video failed' error should be resolved!")
        return 0
    else:
        print("💥 SOME JSON PARSING FIXES ARE NOT WORKING!")
        print("❌ The 'create video failed' error may still occur!")
        return 1

if __name__ == "__main__":
    exit(main())