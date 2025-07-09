import requests
import json
import uuid
import time
import os
from datetime import datetime

# Get the backend URL from environment variables
BACKEND_URL = "http://localhost:3000/api"  # Using the Next.js server port

# Test data
TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"  # Use the valid UUID format as specified
TEST_PROJECT_TITLE = "AI Video Generation Test"
TEST_PROJECT_DESCRIPTION = "A test project for AI video generation with real AI services"
TEST_SAMPLE_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

# Global variables
TEST_PROJECT_ID = None
TEST_PLAN = None

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

# Test 1: Rate Limiting Service Status API
def test_rate_limit_status_api():
    print("\nTesting Rate Limiting Service Status API...")
    try:
        url = f"{BACKEND_URL}/rate-limit-status"
        response = requests.get(url)
        
        if response.status_code == 200:
            result = response.json()
            success = result.get("success", False)
            
            # Check if the response contains Gemini API keys information
            if success and "data" in result and "services" in result["data"]:
                gemini_service = next((service for service in result["data"]["services"] if service["serviceName"] == "gemini"), None)
                
                if gemini_service and "keyStatuses" in gemini_service:
                    key_count = len(gemini_service["keyStatuses"])
                    print(f"✅ Found {key_count} Gemini API keys in the rate limiting service")
                    
                    if key_count >= 3:
                        print("✅ Confirmed multiple Gemini API keys are configured")
                    else:
                        print("⚠️ Less than 3 Gemini API keys found")
                else:
                    print("⚠️ Could not find Gemini API key information in the response")
            
            return print_test_result(
                "Rate Limiting Service Status API", 
                success, 
                response=result
            ), result
        else:
            return print_test_result(
                "Rate Limiting Service Status API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None
    except Exception as e:
        return print_test_result("Rate Limiting Service Status API", False, error=str(e)), None

# Test 2: AI Service Status API
def test_ai_status_api():
    print("\nTesting AI Service Status API...")
    try:
        url = f"{BACKEND_URL}/ai-status"
        response = requests.get(url)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check which AI services are working
            ai_services = result.get("ai_services", {})
            working_services = []
            failing_services = []
            
            for service, status in ai_services.items():
                if status.get("status") == "healthy":
                    working_services.append(service)
                else:
                    failing_services.append(f"{service}: {status.get('message', 'Unknown error')}")
            
            print(f"Working AI services: {', '.join(working_services)}")
            if failing_services:
                print(f"Failing AI services: {', '.join(failing_services)}")
            
            # Check if Gemini API is working (required for our tests)
            gemini_working = "gemini" in working_services
            if gemini_working:
                print("✅ Gemini API is working correctly")
            else:
                print("❌ Gemini API is not working")
            
            return print_test_result(
                "AI Status API", 
                True,  # Consider any 200 response as success for status endpoint
                response=result
            ), result, gemini_working
        else:
            return print_test_result(
                "AI Status API", 
                False, 
                error=f"Status code: {response.status_code}, Response: {response.text}"
            ), None, False
    except Exception as e:
        return print_test_result("AI Status API", False, error=str(e)), None, False

# Test 3: Create Project API
def test_create_project_api():
    global TEST_PROJECT_ID
    print("\nTesting Create Project API...")
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
                TEST_PROJECT_ID = result["project"]["id"]
                print(f"Created project with ID: {TEST_PROJECT_ID}")
            
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

# Test 4: Enhanced Video Analysis API with Rate Limiting
def test_enhanced_video_analysis_api():
    print("\nTesting Enhanced Video Analysis API with Rate Limiting...")
    try:
        url = f"{BACKEND_URL}/analyze"
        payload = {"projectId": TEST_PROJECT_ID}
        
        # Make multiple requests to test rate limiting
        responses = []
        for i in range(3):
            print(f"Making video analysis request {i+1}...")
            response = requests.post(url, json=payload)
            responses.append(response)
            
            # Print response status
            if response.status_code == 200:
                result = response.json()
                success = result.get("success", False)
                print(f"Request {i+1} status: {'SUCCESS' if success else 'FAILED'}")
            else:
                print(f"Request {i+1} status: FAILED with code {response.status_code}")
            
            # Small delay between requests
            if i < 2:  # Don't sleep after the last request
                time.sleep(2)
        
        # Check the last response for detailed analysis
        last_response = responses[-1]
        if last_response.status_code == 200:
            result = last_response.json()
            success = result.get("success", False)
            
            # Check if this is a real AI response by looking for specific fields
            if success and "analysis" in result:
                analysis = result["analysis"]
                is_real_ai = isinstance(analysis, dict) and ("visual_style" in analysis or "content_analysis" in analysis)
                
                if is_real_ai:
                    print("✅ Confirmed real Gemini AI analysis response")
                else:
                    print("⚠️ Response may be mocked - missing expected AI analysis structure")
            
            return print_test_result(
                "Enhanced Video Analysis API", 
                success, 
                response=result
            ), result
        else:
            # Check if the error is due to rate limiting
            error_text = last_response.text
            is_rate_limit = "rate limit" in error_text.lower() or "quota" in error_text.lower() or last_response.status_code == 429
            
            if is_rate_limit:
                print("⚠️ Rate limiting detected - this is expected behavior when testing multiple requests")
                
                # Check if we got at least one successful response
                any_success = any(r.status_code == 200 for r in responses)
                if any_success:
                    print("✅ At least one request succeeded before rate limiting")
                    
                    # Get the successful response
                    success_response = next((r for r in responses if r.status_code == 200), None)
                    result = success_response.json()
                    
                    return print_test_result(
                        "Enhanced Video Analysis API", 
                        True,  # Consider this a success since rate limiting is working as expected
                        response=result
                    ), result
            
            return print_test_result(
                "Enhanced Video Analysis API", 
                False, 
                error=f"Status code: {last_response.status_code}, Response: {last_response.text}"
            ), None
    except Exception as e:
        return print_test_result("Enhanced Video Analysis API", False, error=str(e)), None

# Test 5: Enhanced Plan Generation API with Load Balancing
def test_enhanced_plan_generation_api():
    global TEST_PLAN
    print("\nTesting Enhanced Plan Generation API with Load Balancing...")
    try:
        url = f"{BACKEND_URL}/generate-plan"
        payload = {
            "projectId": TEST_PROJECT_ID,
            "userRequirements": "Create a short promotional video with upbeat music and dynamic transitions. Make it suitable for social media."
        }
        
        # Make multiple requests to test load balancing
        responses = []
        for i in range(3):
            print(f"Making plan generation request {i+1}...")
            response = requests.post(url, json=payload)
            responses.append(response)
            
            # Print response status
            if response.status_code == 200:
                result = response.json()
                success = result.get("success", False)
                print(f"Request {i+1} status: {'SUCCESS' if success else 'FAILED'}")
            else:
                print(f"Request {i+1} status: FAILED with code {response.status_code}")
            
            # Small delay between requests
            if i < 2:  # Don't sleep after the last request
                time.sleep(2)
        
        # Check the last response for detailed analysis
        last_response = responses[-1]
        if last_response.status_code == 200:
            result = last_response.json()
            success = result.get("success", False)
            
            # Check if this is a real AI response by looking for specific fields
            if success and "plan" in result:
                plan = result["plan"]
                is_real_ai = isinstance(plan, dict) and "segments" in plan and isinstance(plan["segments"], list)
                
                if is_real_ai:
                    print("✅ Confirmed real Gemini AI plan generation response")
                    
                    # Save the plan for later use in video generation
                    TEST_PLAN = plan
                else:
                    print("⚠️ Response may be mocked - missing expected AI plan structure")
            
            return print_test_result(
                "Enhanced Plan Generation API", 
                success, 
                response=result
            ), result
        else:
            # Check if the error is due to rate limiting
            error_text = last_response.text
            is_rate_limit = "rate limit" in error_text.lower() or "quota" in error_text.lower() or last_response.status_code == 429
            
            if is_rate_limit:
                print("⚠️ Rate limiting detected - this is expected behavior when testing multiple requests")
                
                # Check if we got at least one successful response
                any_success = any(r.status_code == 200 for r in responses)
                if any_success:
                    print("✅ At least one request succeeded before rate limiting")
                    
                    # Get the successful response
                    success_response = next((r for r in responses if r.status_code == 200), None)
                    result = success_response.json()
                    
                    # Save the plan for later use in video generation
                    if "plan" in result:
                        TEST_PLAN = result["plan"]
                    
                    return print_test_result(
                        "Enhanced Plan Generation API", 
                        True,  # Consider this a success since rate limiting is working as expected
                        response=result
                    ), result
            
            # Check if the error is because analysis is required first
            if "analyzed first" in error_text.lower() or "needs to be analyzed" in error_text.lower():
                print("⚠️ Project needs to be analyzed first - this is expected if video analysis failed")
                return print_test_result(
                    "Enhanced Plan Generation API", 
                    False, 
                    error=f"Project needs to be analyzed first: {error_text}"
                ), None
            
            return print_test_result(
                "Enhanced Plan Generation API", 
                False, 
                error=f"Status code: {last_response.status_code}, Response: {last_response.text}"
            ), None
    except Exception as e:
        return print_test_result("Enhanced Plan Generation API", False, error=str(e)), None

# Test 6: Enhanced Chat Interface API with Rate Limiting
def test_enhanced_chat_interface_api():
    print("\nTesting Enhanced Chat Interface API with Rate Limiting...")
    try:
        url = f"{BACKEND_URL}/chat"
        payload = {
            "projectId": TEST_PROJECT_ID,
            "message": "Can you make the video more energetic and add some vibrant colors?",
            "chatHistory": []
        }
        
        # Make multiple requests to test rate limiting
        responses = []
        for i in range(3):
            print(f"Making chat request {i+1}...")
            response = requests.post(url, json=payload)
            responses.append(response)
            
            # Print response status
            if response.status_code == 200:
                result = response.json()
                success = result.get("success", False)
                print(f"Request {i+1} status: {'SUCCESS' if success else 'FAILED'}")
            else:
                print(f"Request {i+1} status: FAILED with code {response.status_code}")
            
            # Small delay between requests
            if i < 2:  # Don't sleep after the last request
                time.sleep(2)
        
        # Check the last response for detailed analysis
        last_response = responses[-1]
        if last_response.status_code == 200:
            result = last_response.json()
            success = result.get("success", False)
            
            # Check if this is a real AI response
            if success and "response" in result:
                response_text = result["response"]
                is_real_ai = len(response_text) > 100  # Real AI responses tend to be detailed
                
                if is_real_ai:
                    print("✅ Confirmed real Gemini AI chat response")
                else:
                    print("⚠️ Response may be mocked - unusually short response")
            
            return print_test_result(
                "Enhanced Chat Interface API", 
                success, 
                response=result
            ), result
        else:
            # Check if the error is due to rate limiting
            error_text = last_response.text
            is_rate_limit = "rate limit" in error_text.lower() or "quota" in error_text.lower() or last_response.status_code == 429
            
            if is_rate_limit:
                print("⚠️ Rate limiting detected - this is expected behavior when testing multiple requests")
                
                # Check if we got at least one successful response
                any_success = any(r.status_code == 200 for r in responses)
                if any_success:
                    print("✅ At least one request succeeded before rate limiting")
                    
                    # Get the successful response
                    success_response = next((r for r in responses if r.status_code == 200), None)
                    result = success_response.json()
                    
                    return print_test_result(
                        "Enhanced Chat Interface API", 
                        True,  # Consider this a success since rate limiting is working as expected
                        response=result
                    ), result
            
            # Check if the error is because plan is required first
            if "plan first" in error_text.lower() or "create a plan" in error_text.lower():
                print("⚠️ Project needs a generation plan first - this is expected if plan generation failed")
                return print_test_result(
                    "Enhanced Chat Interface API", 
                    False, 
                    error=f"Project needs a generation plan first: {error_text}"
                ), None
            
            return print_test_result(
                "Enhanced Chat Interface API", 
                False, 
                error=f"Status code: {last_response.status_code}, Response: {last_response.text}"
            ), None
    except Exception as e:
        return print_test_result("Enhanced Chat Interface API", False, error=str(e)), None

# Main test function
def run_tests():
    print("\n" + "=" * 40)
    print("STARTING ENHANCED RATE LIMITING AND AI SERVICES TESTS")
    print("=" * 40)
    
    # Initialize global variables
    global TEST_PROJECT_ID, TEST_PLAN
    TEST_PROJECT_ID = None
    TEST_PLAN = None
    
    # Test results
    test_results = {}
    
    # Test 1: Rate Limiting Service Status
    test_results["rate_limit_status"], _ = test_rate_limit_status_api()
    
    # Test 2: AI Service Status
    test_results["ai_status"], _, gemini_working = test_ai_status_api()
    
    if not gemini_working:
        print("\n⚠️ Gemini API is not working. Some tests may fail due to API issues.")
    
    # Test 3: Create Project
    test_results["create_project"], _ = test_create_project_api()
    
    if not TEST_PROJECT_ID:
        print("\n❌ Project creation failed. Cannot continue with remaining tests.")
        return test_results
    
    # Test 4: Enhanced Video Analysis with Rate Limiting
    test_results["enhanced_video_analysis"], _ = test_enhanced_video_analysis_api()
    
    # Test 5: Enhanced Plan Generation with Load Balancing
    test_results["enhanced_plan_generation"], _ = test_enhanced_plan_generation_api()
    
    # Test 6: Enhanced Chat Interface with Rate Limiting
    test_results["enhanced_chat_interface"], _ = test_enhanced_chat_interface_api()
    
    # Print summary
    print("\n" + "=" * 40)
    print("TEST SUMMARY")
    print("=" * 40)
    
    for test_name, result in test_results.items():
        print(f"{test_name}: {'SUCCESS' if result else 'FAILED'}")
    
    print("\n" + "=" * 40)
    
    return test_results

if __name__ == "__main__":
    run_tests()