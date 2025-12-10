import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:8000"

def test_ai_analysis():
    print("🧪 Testing AI Analysis Service...")
    
    # login to get token (assuming test user exists, otherwise skipping token check for now if using local test without auth or mock)
    # Actually, the endpoints depend on get_current_user.
    # To test properly, we should bypass auth or login.
    # Let's try to analyze a message.
    
    # Mock message data
    message_data = {
        "content": "Don't forget the team meeting tomorrow at 10 AM to discuss the project deadline.",
        "sender": "Project Manager",
        "group": "Work Group",
        "type": "text"
    }
    
    # We need a valid token.
    # If no token, we can use the service directly if we want to unit test, 
    # but let's try to test the API if server is running. 
    # But server might not be running with new changes yet.
    
    # Better: Test the service class directly to verify logic without needing running server
    print("📦 Importing service locally...")
    import sys
    sys.path.append(os.getcwd())
    
    from app.services.ai_analyzer import ai_analyzer
    from app.database import SessionLocal
    from app import models
    
    db = SessionLocal()
    try:
        # Get a test user
        user = db.query(models.User).first()
        if not user:
            print("❌ No users found in DB. Please create a user first.")
            return

        print(f"👤 Testing with user: {user.phone_number}")
        
        print(f"📨 Analyzing message: '{message_data['content']}'")
        analysis = ai_analyzer.analyze_message(user.id, message_data, db)
        
        print("\n✅ Analysis Result:")
        print(json.dumps(analysis, indent=2))
        
        # Verify it's in DB
        stored = db.query(models.AnalyzedMessage).filter(
            models.AnalyzedMessage.user_id == user.id
        ).order_by(models.AnalyzedMessage.created_at.desc()).first()
        
        print(f"\n💾 Stored in DB (ID: {stored.id})")
        print(f"   Summary: {stored.ai_summary}")
        print(f"   Category: {stored.category}")
        
        # Verify tasks
        tasks = db.query(models.AITask).filter(
            models.AITask.source_message_id == stored.id
        ).all()
        
        print(f"\n📋 Generated Tasks ({len(tasks)}):")
        for t in tasks:
            print(f"   - {t.task_description} (Priority: {t.priority})")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_ai_analysis()
