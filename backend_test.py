import requests
import json
import uuid
import time
import os
from datetime import datetime

# Get the backend URL from environment variables
BACKEND_URL = "https://tgjuxfndmuxwzloxezev.supabase.co/api"  # Using Supabase URL as the backend URL

# Test data
TEST_USER_ID = str(uuid.uuid4())
TEST_PROJECT_TITLE = "Test Video Project"
TEST_PROJECT_DESCRIPTION = "A test project for API testing"

# Helper function to print test results
def print_test_result(test_name, success, response=None, error=None):
    print(f"\n{'=' * 80}")
    print(f"TEST: {test_name}")
    print(f"STATUS: {'SUCCESS' if success else 'FAILED'}")
    if response:
        print(f"RESPONSE: {json.dumps(response, indent=2)}")
    if error:
        print(f"ERROR: {error}")
    print(f"{'=' * 80}\n")
    return success

# Helper function to create a test project
def create_test_project():
    print("\nCreating a test project...")
    
    # Since we can't actually upload files in this test environment,
    # we'll simulate a project creation with mock data
    
    # In a real test, we would use:
    # files = {
    #     'video': ('test_video.mp4', open('test_video.mp4', 'rb'), 'video/mp4'),
    #     'image': ('test_image.jpg', open('test_image.jpg', 'rb'), 'image/jpeg'),
    #     'audio': ('test_audio.mp3', open('test_audio.mp3', 'rb'), 'audio/mpeg')
    # }
    # data = {
    #     'title': TEST_PROJECT_TITLE,
    #     'description': TEST_PROJECT_DESCRIPTION,
    #     'userId': TEST_USER_ID
    # }
    # response = requests.post(f"{BACKEND_URL}/projects", files=files, data=data)
    
    # For testing purposes, we'll create a project directly in the database
    # This is a mock response that simulates what we'd get from the API
    mock_project_id = str(uuid.uuid4())
    mock_response = {
        "success": True,
        "project": {
            "id": mock_project_id,
            "user_id": TEST_USER_ID,
            "title": TEST_PROJECT_TITLE,
            "description": TEST_PROJECT_DESCRIPTION,
            "sample_video_url": f"https://example.com/videos/{mock_project_id}.mp4",
            "character_image_url": f"https://example.com/images/{mock_project_id}.jpg",
            "audio_file_url": f"https://example.com/audio/{mock_project_id}.mp3",
            "status": "created",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    }
    
    print(f"Created test project with ID: {mock_project_id}")
    return mock_response["project"]

# Test 1: Video Analysis API
def test_video_analysis_api(project_id):
    print("\nTesting Video Analysis API...")
    try:
        url = f"{BACKEND_URL}/analyze"
        payload = {"projectId": project_id}
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            return print_test_result(
                "Video Analysis API", 
                success, 
                response=result
            ), result
        else:
            return print_test_result(
                "Video Analysis API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Video Analysis API", False, error=str(e)), None

# Test 2: Plan Generation API
def test_plan_generation_api(project_id):
    print("\nTesting Plan Generation API...")
    try:
        url = f"{BACKEND_URL}/generate-plan"
        payload = {
            "projectId": project_id,
            "userRequirements": "Create a short promotional video with upbeat music"
        }
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            return print_test_result(
                "Plan Generation API", 
                success, 
                response=result
            ), result
        else:
            return print_test_result(
                "Plan Generation API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Plan Generation API", False, error=str(e)), None

# Test 3: Chat Interface API
def test_chat_interface_api(project_id):
    print("\nTesting Chat Interface API...")
    try:
        url = f"{BACKEND_URL}/chat"
        payload = {
            "projectId": project_id,
            "message": "Can you make the video more energetic?",
            "chatHistory": []
        }
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            return print_test_result(
                "Chat Interface API", 
                success, 
                response=result
            ), result
        else:
            return print_test_result(
                "Chat Interface API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Chat Interface API", False, error=str(e)), None

# Test 4: Project Management API - Get Project by ID
def test_get_project_by_id(project_id):
    print("\nTesting Get Project by ID API...")
    try:
        url = f"{BACKEND_URL}/projects/{project_id}"
        response = requests.get(url)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            return print_test_result(
                "Get Project by ID API", 
                success, 
                response=result
            ), result
        else:
            return print_test_result(
                "Get Project by ID API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Get Project by ID API", False, error=str(e)), None

# Test 5: Project Management API - Get Projects by User ID
def test_get_projects_by_user_id(user_id):
    print("\nTesting Get Projects by User ID API...")
    try:
        url = f"{BACKEND_URL}/projects?userId={user_id}"
        response = requests.get(url)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            return print_test_result(
                "Get Projects by User ID API", 
                success, 
                response=result
            ), result
        else:
            return print_test_result(
                "Get Projects by User ID API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Get Projects by User ID API", False, error=str(e)), None

# Test 6: Processing Jobs API
def test_processing_jobs_api(project_id):
    print("\nTesting Processing Jobs API...")
    try:
        url = f"{BACKEND_URL}/jobs?projectId={project_id}"
        response = requests.get(url)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            return print_test_result(
                "Processing Jobs API", 
                success, 
                response=result
            ), result
        else:
            return print_test_result(
                "Processing Jobs API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Processing Jobs API", False, error=str(e)), None

# Test 7: Video Generation API
def test_video_generation_api(project_id):
    print("\nTesting Video Generation API...")
    try:
        # Create a mock plan for video generation
        mock_plan = {
            "segments": [
                {
                    "segment_number": 1,
                    "duration": 15,
                    "description": "Opening scene with product introduction",
                    "prompt": "A sleek product reveal with dynamic lighting",
                    "ai_model": "runway-gen4"
                },
                {
                    "segment_number": 2,
                    "duration": 15,
                    "description": "Feature showcase with text overlays",
                    "prompt": "Product features being demonstrated with text callouts",
                    "ai_model": "google-veo-3"
                }
            ],
            "total_duration": 30
        }
        
        url = f"{BACKEND_URL}/generate-video"
        payload = {
            "projectId": project_id,
            "plan": mock_plan
        }
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            return print_test_result(
                "Video Generation API", 
                success, 
                response=result
            ), result
        else:
            return print_test_result(
                "Video Generation API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Video Generation API", False, error=str(e)), None

# Test 8: Error Handling - Invalid Project ID
def test_error_handling_invalid_project_id():
    print("\nTesting Error Handling - Invalid Project ID...")
    try:
        invalid_id = "invalid-project-id"
        url = f"{BACKEND_URL}/analyze"
        payload = {"projectId": invalid_id}
        response = requests.post(url, json=payload)
        
        # For error handling tests, we expect a non-200 status code
        expected_error = response.status_code != 200
        
        if expected_error:
            result = response.json()
            return print_test_result(
                "Error Handling - Invalid Project ID", 
                True, 
                response=result
            ), result
        else:
            return print_test_result(
                "Error Handling - Invalid Project ID", 
                False, 
                error="Expected an error response but got a success"
            ), None
    except Exception as e:
        return print_test_result("Error Handling - Invalid Project ID", False, error=str(e)), None

# Main test function
def run_tests():
    print("\n" + "=" * 40)
    print("STARTING API TESTS")
    print("=" * 40)
    
    # Create a test project
    test_project = create_test_project()
    project_id = test_project["id"]
    user_id = test_project["user_id"]
    
    # Run all tests
    test_results = {}
    
    # Test 1: Video Analysis API
    test_results["video_analysis"], analysis_result = test_video_analysis_api(project_id)
    
    # Test 2: Plan Generation API
    test_results["plan_generation"], plan_result = test_plan_generation_api(project_id)
    
    # Test 3: Chat Interface API
    test_results["chat_interface"], chat_result = test_chat_interface_api(project_id)
    
    # Test 4: Project Management API - Get Project by ID
    test_results["get_project"], project_result = test_get_project_by_id(project_id)
    
    # Test 5: Project Management API - Get Projects by User ID
    test_results["get_projects"], projects_result = test_get_projects_by_user_id(user_id)
    
    # Test 6: Processing Jobs API
    test_results["processing_jobs"], jobs_result = test_processing_jobs_api(project_id)
    
    # Test 7: Video Generation API
    test_results["video_generation"], video_result = test_video_generation_api(project_id)
    
    # Test 8: Error Handling - Invalid Project ID
    test_results["error_handling"], error_result = test_error_handling_invalid_project_id()
    
    # Print summary
    print("\n" + "=" * 40)
    print("TEST SUMMARY")
    print("=" * 40)
    
    for test_name, result in test_results.items():
        print(f"{test_name}: {'SUCCESS' if result else 'FAILED'}")
    
    print("\n" + "=" * 40)
    
    # Return overall success (all tests passed)
    return all(test_results.values())

if __name__ == "__main__":
    run_tests()