import os
import google.generativeai as genai

# API Key
API_KEY = "AIzaSyAewHn3G08zoHfuwVxrNMeFl3m2O-MiI3M"

# Configure Gemini
genai.configure(api_key=API_KEY)

print("🔍 Checking available models...")
print("")

try:
    # List all available models
    models = genai.list_models()
    
    print("✅ Available models:")
    print("")
    for model in models:
        if 'generateContent' in model.supported_generation_methods:
            print(f"  📦 {model.name}")
            print(f"     Description: {model.display_name}")
            print("")
    
    # Try with the first available model
    print("🧪 Testing with first available model...")
    print("")
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Say 'Hello from Gemini!'")
    
    print("✅ SUCCESS! Gemini API is working!")
    print("")
    print(f"📝 Response: {response.text}")
    print("")
    print("🎉 Your student plan is active!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("")
    print("Trying alternative approach...")
    
    try:
        # Try with gemini-1.5-flash
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Hello!")
        print(f"✅ Works with gemini-1.5-flash: {response.text}")
    except Exception as e2:
        print(f"❌ Also failed: {e2}")
