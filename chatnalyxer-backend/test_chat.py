
import requests
import sys

BASE_URL = "http://localhost:8000"

def test_chat():
    print("🚀 Starting AI Chat Endpoint Test...")
    
    # 1. Login
    phone_number = "+917330864041"
    password = "@RAHUL123"
    
    print(f"\n🔐 Logging in with {phone_number}...")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "phone_number": phone_number,
            "password": password
        })
        
        if response.status_code != 200:
            print(f"❌ Login Failed: {response.text}")
            return
            
        token = response.json().get("token") or response.json().get("access_token")
        print("✅ Login Successful")
        
        headers = {"Authorization": f"Bearer {token}"}
        
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return

    # 2. Send Chat Message
    user_message = "What are my upcoming exams?"
    print(f"\n💬 Sending Chat Message: '{user_message}'")
    
    try:
        res = requests.post(
            f"{BASE_URL}/ai/chat", 
            headers=headers,
            json={"message": user_message}
        )
        
        if res.status_code == 200:
            data = res.json()
            print("✅ Chat API returned 200 OK")
            print(f"\n🤖 AI Response: {data.get('response')}")
            
            if "I'm having trouble" in data.get('response', '') or "AI Service is currently unavailable" in data.get('response', ''):
                 print("⚠️ Note: AI Service fallback triggered (Normal if no API Key)")
            else:
                 print("✨ Success: Real AI response received!")
                 
        else:
            print(f"❌ Chat API Failed: {res.status_code}")
            print(res.text)
            
    except Exception as e:
        print(f"❌ Error during chat request: {e}")

if __name__ == "__main__":
    test_chat()
