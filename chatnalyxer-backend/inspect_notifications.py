from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Notification, Event, User
import os

# Setup DB connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/chatnalyxer")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def inspect():
    print("🔍 Inspecting Notifications...")
    
    # 1. Find the latest 5 Events
    events = db.query(Event).order_by(Event.id.desc()).limit(5).all()
    if not events:
        print("❌ No events found.")
        return

    for last_event in events:
        print(f"\n📅 Event: ID={last_event.id}, Title='{last_event.title}', Created='{last_event.created_at}'")

        # 2. Find Notifications for this event
        notifs = db.query(Notification).filter(Notification.related_event_id == last_event.id).all()
        
        print(f"🔔 Found {len(notifs)} notifications:")
        for n in notifs:
            print(f"   - ID={n.id}, Type='{n.notification_type}', Scheduled='{n.scheduled_time}', Sent={n.is_sent}")

if __name__ == "__main__":
    try:
        inspect()
    finally:
        db.close()
