#!/usr/bin/env python3
"""
Focused test for video generation workflow to verify JSON parsing fixes.
Tests the complete workflow: analyze → generate-plan → generate-video
"""

import requests
import json
import uuid
import time

# Backend URL
BACKEND_URL = "http://localhost:3000/api"

# Test data
TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_PROJECT_TITLE = "JSON Parsing Fix Test"
TEST_PROJECT_DESCRIPTION = "Testing the video generation workflow after JSON parsing fixes"
TEST_SAMPLE_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

def print_test_result(test_name, success, response=None, error=None):
    """Print formatted test results"""
    print(f"\n{'=' * 80}")
    print(f"TEST: {test_name}")
    print(f"STATUS: {'✅ SUCCESS' if success else '❌ FAILED'}")
    if response:
        print(f"RESPONSE: {json.dumps(response, indent=2)}")
    if error:
        print(f"ERROR: {error}")
    print(f"{'=' * 80}\n")
    return success

def test_create_project():
    """Create a test project"""
    print("Step 1: Creating test project...")
    try:
        url = f"{BACKEND_URL}/projects"
        payload = {
            "title": TEST_PROJECT_TITLE,
            "description": TEST_PROJECT_DESCRIPTION,
            "userId": TEST_USER_ID,
            "sampleVideoUrl": TEST_SAMPLE_VIDEO_URL
        }
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            
            if success and "project" in result:
                project_id = result["project"]["id"]
                print(f"✅ Created project with ID: {project_id}")
                return print_test_result("Create Project", success, response=result), project_id
            else:
                return print_test_result("Create Project", False, response=result), None
        else:
            return print_test_result("Create Project", False, error=f"Status: {response.status_code}, Response: {response.text}"), None
    except Exception as e:
        return print_test_result("Create Project", False, error=str(e)), None

def test_video_analysis(project_id):
    """Test video analysis API"""
    print("Step 2: Testing video analysis...")
    try:
        url = f"{BACKEND_URL}/analyze"
        payload = {"projectId": project_id}
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            
            if success and "analysis" in result:
                print("✅ Video analysis completed successfully")
                return print_test_result("Video Analysis", success, response=result), result.get("analysis")
            else:
                return print_test_result("Video Analysis", False, response=result), None
        else:
            return print_test_result("Video Analysis", False, error=f"Status: {response.status_code}, Response: {response.text}"), None
    except Exception as e:
        return print_test_result("Video Analysis", False, error=str(e)), None

def test_plan_generation(project_id):
    """Test plan generation API - this should now parse analysis_result correctly"""
    print("Step 3: Testing plan generation (JSON parsing fix)...")
    try:
        url = f"{BACKEND_URL}/generate-plan"
        payload = {
            "projectId": project_id,
            "userRequirements": "Create a short promotional video with upbeat music and dynamic transitions"
        }
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            
            if success and "plan" in result:
                plan = result["plan"]
                print("✅ Plan generation completed successfully")
                print(f"✅ Plan has {len(plan.get('segments', []))} segments")
                print(f"✅ Total duration: {plan.get('total_duration', 'N/A')} seconds")
                return print_test_result("Plan Generation", success, response=result), plan
            else:
                return print_test_result("Plan Generation", False, response=result), None
        else:
            return print_test_result("Plan Generation", False, error=f"Status: {response.status_code}, Response: {response.text}"), None
    except Exception as e:
        return print_test_result("Plan Generation", False, error=str(e)), None

def test_chat_interface(project_id):
    """Test chat interface API - this should now parse generation_plan correctly"""
    print("Step 4: Testing chat interface (JSON parsing fix)...")
    try:
        url = f"{BACKEND_URL}/chat"
        payload = {
            "projectId": project_id,
            "message": "Can you make the video more energetic and add vibrant colors?",
            "chatHistory": []
        }
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            
            if success and "response" in result:
                print("✅ Chat interface working correctly")
                print(f"✅ Plan updated: {result.get('plan_updated', False)}")
                return print_test_result("Chat Interface", success, response=result), result
            else:
                return print_test_result("Chat Interface", False, response=result), None
        else:
            return print_test_result("Chat Interface", False, error=f"Status: {response.status_code}, Response: {response.text}"), None
    except Exception as e:
        return print_test_result("Chat Interface", False, error=str(e)), None

def test_video_generation(project_id):
    """Test video generation API - this should now parse generation_plan correctly and not fail with 'total_duration' error"""
    print("Step 5: Testing video generation (JSON parsing fix)...")
    try:
        # Create a test plan structure
        test_plan = {
            "plan_summary": "Test video generation with JSON parsing fix",
            "total_duration": 30,
            "segments": [
                {
                    "segment_number": 1,
                    "duration": 15,
                    "description": "Opening scene",
                    "visual_style": "Bright and dynamic",
                    "ai_model": "runway-gen4",
                    "prompt": "A vibrant opening scene with dynamic lighting",
                    "text_overlay": "Welcome",
                    "audio_notes": "Upbeat music"
                },
                {
                    "segment_number": 2,
                    "duration": 15,
                    "description": "Closing scene",
                    "visual_style": "Professional and clean",
                    "ai_model": "google-veo-3",
                    "prompt": "A professional closing with brand elements",
                    "text_overlay": "Thank You",
                    "audio_notes": "Fade out music"
                }
            ],
            "transitions": [
                {
                    "between_segments": "1-2",
                    "type": "fade",
                    "description": "Smooth fade transition"
                }
            ],
            "audio_strategy": {
                "type": "generated",
                "description": "Upbeat background music",
                "voice_requirements": "Professional narrator",
                "background_music": "Upbeat electronic",
                "sound_effects": ["whoosh", "fade"]
            }
        }
        
        url = f"{BACKEND_URL}/generate-video"
        payload = {
            "projectId": project_id,
            "plan": test_plan
        }
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            
            if success and "job_id" in result:
                job_id = result["job_id"]
                print(f"✅ Video generation started successfully with job ID: {job_id}")
                print("✅ No 'Cannot read properties of undefined (reading 'total_duration')' error!")
                return print_test_result("Video Generation", success, response=result), job_id
            else:
                return print_test_result("Video Generation", False, response=result), None
        else:
            return print_test_result("Video Generation", False, error=f"Status: {response.status_code}, Response: {response.text}"), None
    except Exception as e:
        return print_test_result("Video Generation", False, error=str(e)), None

def test_complete_workflow():
    """Test the complete video generation workflow"""
    print("\n" + "=" * 100)
    print("TESTING COMPLETE VIDEO GENERATION WORKFLOW - JSON PARSING FIXES")
    print("=" * 100)
    
    # Step 1: Create project
    create_success, project_id = test_create_project()
    if not create_success or not project_id:
        print("❌ Cannot continue workflow - project creation failed")
        return False
    
    # Step 2: Analyze video
    analysis_success, analysis_result = test_video_analysis(project_id)
    if not analysis_success:
        print("⚠️ Video analysis failed, but continuing to test JSON parsing fixes...")
    
    # Step 3: Generate plan (tests analysis_result JSON parsing)
    plan_success, plan_result = test_plan_generation(project_id)
    if not plan_success:
        print("❌ Plan generation failed - JSON parsing fix may not be working")
        return False
    
    # Step 4: Test chat interface (tests generation_plan JSON parsing)
    chat_success, chat_result = test_chat_interface(project_id)
    if not chat_success:
        print("❌ Chat interface failed - JSON parsing fix may not be working")
        return False
    
    # Step 5: Generate video (tests generation_plan JSON parsing and total_duration access)
    video_success, job_id = test_video_generation(project_id)
    if not video_success:
        print("❌ Video generation failed - JSON parsing fix may not be working")
        return False
    
    print("\n" + "=" * 100)
    print("✅ COMPLETE WORKFLOW TEST: SUCCESS")
    print("✅ All JSON parsing fixes are working correctly!")
    print("✅ No 'Cannot read properties of undefined' errors encountered!")
    print("=" * 100)
    
    return True

def main():
    """Main test function"""
    print("Starting focused video generation workflow test...")
    print("Testing JSON parsing fixes for:")
    print("- /app/app/api/generate-plan/route.ts (analysis_result parsing)")
    print("- /app/app/api/chat/route.ts (generation_plan parsing)")
    print("- /app/app/api/generate-video/route.ts (generation_plan parsing)")
    
    success = test_complete_workflow()
    
    if success:
        print("\n🎉 ALL TESTS PASSED - JSON parsing fixes are working correctly!")
        return 0
    else:
        print("\n💥 SOME TESTS FAILED - JSON parsing fixes may need more work")
        return 1

if __name__ == "__main__":
    exit(main())