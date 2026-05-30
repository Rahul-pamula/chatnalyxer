
import requests
import sys

BASE_URL = "http://localhost:8000"

def test_analytics():
    print("🚀 Starting Analytics Endpoint Test...")
    
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

    # 2. Fetch Analytics
    print("\n📊 Fetching Analytics Data...")
    try:
        res = requests.get(f"{BASE_URL}/messages/analytics/public", headers=headers)
        
        if res.status_code == 200:
            data = res.json()
            print("✅ Analytics API returned 200 OK")
            print("\n📈 Data Summary:")
            print(f"   - Total Messages: {data.get('total_messages')}")
            print(f"   - Avg Urgency: {data.get('urgency_score_avg')}")
            print(f"   - Priority Dist: {data.get('priority_distribution')}")
            print(f"   - Top Keywords: {len(data.get('top_keywords', []))} found")
            
            # Validation
            if 'priority_distribution' in data and 'total_messages' in data:
                print("\n✨ SUCCESS: Analytics verification passed!")
            else:
                print("\n❌ FAILURE: Missing required fields in response")
                print(data)
        else:
            print(f"❌ Analytics API Failed: {res.status_code}")
            print(res.text)
            
    except Exception as e:
        print(f"❌ Error fetching analytics: {e}")

if __name__ == "__main__":
    test_analytics()
