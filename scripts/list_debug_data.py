import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'chatnalyxer-backend')))

from dotenv import load_dotenv
backend_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'chatnalyxer-backend', '.env'))
load_dotenv(backend_env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def list_events():
    print(f"🔌 Connecting to database...")
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("🔍 Listing all events...")
        result = session.execute(text("SELECT id, title, event_date, event_time FROM events"))
        events = result.fetchall()
        
        if not events:
            print("No events found in 'events' table.")
        else:
            print(f"Found {len(events)} events:")
            for e in events:
                print(f" - ID: {e.id} | Title: {e.title} | Date: {e.event_date} {e.event_time}")

        print("\n🔍 Listing all notifications...")
        result = session.execute(text("SELECT id, title, related_event_id FROM notifications"))
        notifs = result.fetchall()
        for n in notifs:
            print(f" - ID: {n.id} | Title: {n.title} | Linked Event ID: {n.related_event_id}")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    list_events()
