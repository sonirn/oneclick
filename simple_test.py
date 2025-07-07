import requests
import json
import time

# API base URL
BASE_URL = "http://localhost:3000/api"

def test_endpoint(endpoint, method="GET", data=None):
    url = f"{BASE_URL}/{endpoint}"
    print(f"\nTesting {method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        else:
            print(f"Unsupported method: {method}")
            return False
        
        print(f"Status code: {response.status_code}")
        
        try:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
            return response.status_code == 200
        except:
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

# Test endpoints
print("=== Testing API Endpoints ===")

# 1. Status endpoint
test_endpoint("status")

# 2. Database test endpoint
test_endpoint("test-db")

# 3. Get projects for a user
test_endpoint("projects?userId=test-user-id")

# 4. Create a project
test_endpoint("projects", "POST", {
    "title": "Test Project",
    "description": "A test project",
    "userId": "test-user-id",
    "mockData": True
})

# 5. Video analysis endpoint
test_endpoint("analyze", "POST", {
    "projectId": "00000000-0000-0000-0000-000000000001"
})

# 6. Plan generation endpoint
test_endpoint("generate-plan", "POST", {
    "projectId": "00000000-0000-0000-0000-000000000001",
    "userRequirements": "Create a short promotional video"
})

# 7. Chat interface endpoint
test_endpoint("chat", "POST", {
    "projectId": "00000000-0000-0000-0000-000000000001",
    "message": "Can you make the video more energetic?",
    "chatHistory": []
})

# 8. Video generation endpoint
test_endpoint("generate-video", "POST", {
    "projectId": "00000000-0000-0000-0000-000000000001",
    "plan": {
        "segments": [
            {
                "segment_number": 1,
                "duration": 15,
                "description": "Opening scene",
                "prompt": "A sleek product reveal",
                "ai_model": "runway-gen4"
            }
        ],
        "total_duration": 15
    }
})

print("\n=== API Testing Complete ===")