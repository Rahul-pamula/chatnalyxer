
import requests
import json
import random
from datetime import datetime, date, timedelta

BASE_URL = "http://localhost:8000"
# Using the bearer token for "rahul" (ID 36) which we can get by logging in or we can assume we have one if we use the same user from previous test.
# However, for simplicity in this test script, we will mock the login flow or just rely on the fact that we can get a token with a known user.
# For now, let's assume we need to login first to get a token.

def test_event_deletion():
    print("🚀 Starting Event Deletion Integration Test...")
    
    # 1. Login to get Token
    phone_number = "+917330864041"
    password = "@RAHUL123"

    print(f"\n🔐 Logging in with {phone_number}...")
    login_payload = {
        "phone_number": phone_number,
        "password": password
    }
    
    # Using the /auth/login endpoint which supports phone/password
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    
    if response.status_code == 200:
        token = response.json().get("token") or response.json().get("access_token")
        print("✅ Login Successful")
    else:
        print(f"❌ Login Failed: {response.text}")
        return

    headers = {"Authorization": f"Bearer {token}"}
    # Skip signup logic


    # 3. Create an Event
    print("\n📅 Creating Test Event...")
    event_date = date.today().isoformat()
    payload = {
        "title": "Test Event To Delete",
        "description": "This event should be deleted",
        "event_date": event_date,
        "event_time": "10:00",
        "location": "Virtual",
        "reminder_minutes": 15,
        "is_all_day": False
    }
    
    res_create = requests.post(f"{BASE_URL}/events", json=payload, headers=headers)
    if res_create.status_code == 200:
        event_data = res_create.json().get("event")
        event_id = event_data.get("id")
        print(f"✅ Event Created: ID {event_id} - {event_data.get('title')}")
    else:
        print(f"❌ Event Creation Failed: {res_create.text}")
        return

    # 4. Verify Event Exists
    print("\n👀 Verifying Event Exists...")
    res_get = requests.get(f"{BASE_URL}/events", headers=headers)
    events = res_get.json().get("events", [])
    found = any(e['id'] == event_id for e in events)
    if found:
        print("✅ Event found in list")
    else:
        print("❌ Event NOT found in list")
        return

    # 5. Delete Event
    print(f"\n🗑️ Deleting Event ID {event_id}...")
    res_delete = requests.delete(f"{BASE_URL}/events/{event_id}", headers=headers)
    
    if res_delete.status_code == 200:
        print("✅ Delete API returned Success")
    else:
        print(f"❌ Delete API Failed: {res_delete.status_code} - {res_delete.text}")
        return

    # 6. Verify Deletion
    print("\n🔍 Verifying Deletion...")
    res_get_after = requests.get(f"{BASE_URL}/events", headers=headers)
    events_after = res_get_after.json().get("events", [])
    found_after = any(e['id'] == event_id for e in events_after)
    
    if not found_after:
        print("✨ SUCCESS: Event was deleted and is no longer in the list!")
    else:
        print("❌ FAILURE: Event still exists in the list!")

if __name__ == "__main__":
    test_event_deletion()
