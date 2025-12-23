"""
Test delete endpoint directly
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Get a valid token - you'll need to replace this with your actual token
# You can get it from the mobile app or login endpoint
BASE_URL = "http://localhost:8000"

# Test with user 36's token (you'll need to get this from your app)
print("Testing delete endpoint...")
print("\nTo get your token:")
print("1. Open your mobile app")
print("2. Check the console logs for 'Authorization: Bearer <token>'")
print("3. Or login via API:")
print(f"   POST {BASE_URL}/auth/login")
print("   Body: {{\"phone_number\": \"your_phone\", \"password\": \"your_password\"}}")
print("\nOnce you have the token, test delete with:")
print(f"   curl -X DELETE {BASE_URL}/messages/298 \\")
print("        -H 'Authorization: Bearer YOUR_TOKEN'")
