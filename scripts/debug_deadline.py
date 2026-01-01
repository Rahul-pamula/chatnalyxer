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

def list_recent_events():
    print(f"🔌 Connecting to database...")
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("🔍 Listing recent Scheduled Events (last 5)...")
        result = session.execute(text("SELECT id, title, deadline, message_id FROM scheduled_events ORDER BY id DESC LIMIT 5"))
        events = result.fetchall()
        
        if not events:
            print("No scheduled events found.")
        else:
            for e in events:
                print(f" - ID: {e.id} | MsgID: {e.message_id} | Deadline: {e.deadline} | Title: {e.title}")

        print("\n🔍 Listing recent Messages (last 5)...")
        result = session.execute(text("SELECT id, content, deadline_extracted, created_at FROM messages ORDER BY id DESC LIMIT 5"))
        msgs = result.fetchall()
        for m in msgs:
            print(f" - ID: {m.id} | Created: {m.created_at} | Deadline: {m.deadline_extracted} | Content: {m.content[:30]}...")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    list_recent_events()
