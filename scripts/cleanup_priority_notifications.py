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

def cleanup_priority_notifications():
    print(f"🔌 Connecting to database...")
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("🔍 checking for unlinked 'Priority' notifications...")
        
        # Select them first to show what we are deleting
        result = session.execute(text("SELECT id, title, message FROM notifications WHERE related_event_id IS NULL AND title LIKE 'Priority:%'"))
        notifs = result.fetchall()
        
        if not notifs:
            print("✅ No unlinked priority notifications found.")
        else:
            print(f"⚠️ Found {len(notifs)} unlinked priority notifications:")
            for n in notifs:
                print(f" - ID: {n.id} | Title: {n.title} | Msg: {n.message[:30]}...")
            
            print("🧹 Deleting them...")
            session.execute(text("DELETE FROM notifications WHERE related_event_id IS NULL AND title LIKE 'Priority:%'"))
            session.commit()
            print(f"✅ Successfully deleted {len(notifs)} notifications.")
            
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    cleanup_priority_notifications()
