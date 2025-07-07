import requests
import json
import uuid
import time
import os
from datetime import datetime

# Get the backend URL from environment variables
BACKEND_URL = "http://localhost:3001/api"

# Test data
TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"  # Use the valid UUID format as specified
EXISTING_PROJECT_ID = "5306bf9b-a012-4f41-95bf-5323f846318f"  # Existing project ID from the review request
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

# Test 1: Status API
def test_status_api():
    print("\nTesting Status API...")
    try:
        url = f"{BACKEND_URL}/status"
        response = requests.get(url)
        
        if response.status_code == 200:
            result = response.json()
            success = True  # Consider any 200 response as success for status endpoint
            return print_test_result(
                "Status API", 
                success, 
                response=result
            ), result
        else:
            return print_test_result(
                "Status API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Status API", False, error=str(e)), None

# Test 2: Create Project API
def test_create_project_api():
    print("\nTesting Create Project API...")
    try:
        url = f"{BACKEND_URL}/projects"
        payload = {
            "title": TEST_PROJECT_TITLE,
            "description": TEST_PROJECT_DESCRIPTION,
            "userId": TEST_USER_ID
        }
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            return print_test_result(
                "Create Project API", 
                success, 
                response=result
            ), result
        else:
            return print_test_result(
                "Create Project API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Create Project API", False, error=str(e)), None

# Test 3: Get Projects by User ID API
def test_get_projects_by_user_id():
    print("\nTesting Get Projects by User ID API...")
    try:
        url = f"{BACKEND_URL}/projects?userId={TEST_USER_ID}"
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

# Test 4: Get Project by ID API
def test_get_project_by_id():
    print("\nTesting Get Project by ID API...")
    try:
        # First try with the existing project ID
        url = f"{BACKEND_URL}/projects/{EXISTING_PROJECT_ID}"
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
            # If the existing project ID doesn't work, try with a project from the user's projects
            print(f"Existing project ID not found, trying to get a project from user's projects...")
            user_projects_url = f"{BACKEND_URL}/projects?userId={TEST_USER_ID}"
            user_projects_response = requests.get(user_projects_url)
            
            if user_projects_response.status_code == 200:
                user_projects_result = user_projects_response.json()
                if user_projects_result.get("success", False) and len(user_projects_result.get("projects", [])) > 0:
                    project_id = user_projects_result["projects"][0]["id"]
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
            
            # If we still don't have a valid project, return failure
            return print_test_result(
                "Get Project by ID API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Get Project by ID API", False, error=str(e)), None

# Test 5: Video Analysis API
def test_video_analysis_api():
    print("\nTesting Video Analysis API...")
    try:
        url = f"{BACKEND_URL}/analyze"
        payload = {"projectId": EXISTING_PROJECT_ID}
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

# Test 6: Plan Generation API
def test_plan_generation_api():
    print("\nTesting Plan Generation API...")
    try:
        url = f"{BACKEND_URL}/generate-plan"
        payload = {
            "projectId": EXISTING_PROJECT_ID,
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

# Test 7: Chat Interface API
def test_chat_interface_api():
    print("\nTesting Chat Interface API...")
    try:
        url = f"{BACKEND_URL}/chat"
        payload = {
            "projectId": EXISTING_PROJECT_ID,
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

# Test 8: Video Generation API
def test_video_generation_api():
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
            "projectId": EXISTING_PROJECT_ID,
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

# Main test function
def run_tests():
    print("\n" + "=" * 40)
    print("STARTING API TESTS")
    print("=" * 40)
    
    # Run all tests
    test_results = {}
    
    # Test 1: Status API
    test_results["status"], status_result = test_status_api()
    
    # Test 2: Create Project API
    test_results["create_project"], create_project_result = test_create_project_api()
    
    # Test 3: Get Projects by User ID API
    test_results["get_projects"], get_projects_result = test_get_projects_by_user_id()
    
    # Test 4: Get Project by ID API
    test_results["get_project"], get_project_result = test_get_project_by_id()
    
    # Test 5: Video Analysis API
    test_results["video_analysis"], analysis_result = test_video_analysis_api()
    
    # Test 6: Plan Generation API
    test_results["plan_generation"], plan_result = test_plan_generation_api()
    
    # Test 7: Chat Interface API
    test_results["chat_interface"], chat_result = test_chat_interface_api()
    
    # Test 8: Video Generation API
    test_results["video_generation"], video_result = test_video_generation_api()
    
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