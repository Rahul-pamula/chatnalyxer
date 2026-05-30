import os
import google.generativeai as genai

# API Key
API_KEY = "AIzaSyAewHn3G08zoHfuwVxrNMeFl3m2O-MiI3M"

# Configure Gemini
genai.configure(api_key=API_KEY)

# Use Gemini 2.5 Flash (latest, fast, and higher quota!)
model = genai.GenerativeModel('gemini-2.5-flash')

# Test connection
print("🧪 Testing Gemini 2.5 Flash API connection...")
print("")

try:
    response = model.generate_content("Say 'Hello from Gemini 2.5 Flash!' and tell me one cool thing you can do")
    print("✅ SUCCESS! Gemini API is connected!")
    print("")
    print(f"📝 Response: {response.text}")
    print("")
    print("🎉 Your student plan is working with Gemini 2.5 Flash!")
    print("💡 This is the LATEST model with HIGHER QUOTAS - perfect for your project!")
    
except Exception as e:
    print("❌ Connection failed!")
    print(f"Error: {e}")
