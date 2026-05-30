
import requests
import json
import random
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_KEY = "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4"

def test_message_flow():
    print("🚀 Starting Message Flow Integration Test...")
    
    # 1. Setup Data
    user_id = 36
    # Randomize group ID to mimic a new group
    whatsapp_group_id = f"12036304{random.randint(1000,9999)}@g.us" 
    group_name = "Test Class Group 101"
    
    # 2. Sync Group first (like user-session.js does)
    print(f"\n📡 Syncing Group: {group_name} ({whatsapp_group_id})")
    payload_sync = {
        "user_id": user_id,
        "groups": [
            {
                "whatsapp_id": whatsapp_group_id,
                "name": group_name
            }
        ]
    }
    
    res = requests.post(f"{BASE_URL}/groups/sync-from-whatsapp", json=payload_sync, headers={"X-API-Key": API_KEY})
    if res.status_code == 201:
        print("✅ Group Synced Successfully")
    else:
        print(f"❌ Group Sync Failed: {res.status_code} - {res.text}")
        return

    # 3. Simulate Incoming Message (High Priority Context)
    print("\n📨 Sending High Priority Message...")
    message_content = "⚠️ URGENT: The final exam scheduled for tomorrow has been moved to Room 304. Please bring your ID cards! Deadline to submit assignment is tonight."
    
    payload_msg = {
        "user_id": user_id,
        "content": message_content,
        "group_id": whatsapp_group_id,
        "sender_name": "Professor Snape",
        "timestamp": datetime.now().isoformat(),
        "extracted_content": None,
        "media_url": None,
        "media_type": "text"
    }
    
    res = requests.post(f"{BASE_URL}/messages/from-whatsapp", json=payload_msg, headers={"X-API-Key": API_KEY})
    
    if res.status_code == 201:
        data = res.json()
        print("✅ Message Received & Processed by Backend")
        print(f"   🆔 Message ID: {data.get('id')}")
        print(f"   📊 Priority: {data.get('priority_level')} (Expected: HIGH)")
        print(f"   🚨 Is Priority: {data.get('is_priority')}")
        print(f"   🤖 AI Summary: {data.get('ai_summary')}")
        
        # Validation
        if data.get('priority_level') in ['HIGH', 'CRITICAL']:
            print("✨ SUCCESS: AI correctly identified priority!")
        else:
            print("⚠️ WARNING: AI priority might be low/medium (check logic).")
            
    else:
        print(f"❌ Message Failed: {res.status_code} - {res.text}")

    # 4. Verify Dashboard Fetch (Public/Authenticated)
    # We'll use the public endpoint for simplicity to check if it's RETRIEVABLE
    print("\n👀 Verifying Fetch (Simulating Dashboard)...")
    res = requests.get(f"{BASE_URL}/messages/public")
    if res.status_code == 200:
        messages = res.json()
        # Find our message
        found = False
        for msg in messages:
            if msg.get('content') == message_content:
                found = True
                print("✅ Found newly created message in feed!")
                break
        if not found:
            print("❌ Message not found in public feed (might be filtering issue?)")
    else:
        print(f"❌ Failed to fetch messages: {res.status_code}")

if __name__ == "__main__":
    test_message_flow()
