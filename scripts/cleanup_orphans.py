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
if not DATABASE_URL:
    print("❌ Could not find DATABASE_URL")
    sys.exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def cleanup_orphans():
    print(f"🔌 Connecting to database...")
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("🔍 Checking for orphaned notifications...")
        
        # Count orphans
        result = session.execute(text("SELECT count(*) FROM notifications WHERE related_event_id IS NOT NULL AND related_event_id NOT IN (SELECT id FROM events)"))
        count = result.scalar()
        
        if count == 0:
            print("✅ No orphaned notifications found.")
        else:
            print(f"⚠️ Found {count} orphaned notifications (events deleted but notification remained).")
            print("🧹 Cleaning up...")
            
            # Delete orphans
            session.execute(text("DELETE FROM notifications WHERE related_event_id IS NOT NULL AND related_event_id NOT IN (SELECT id FROM events)"))
            session.commit()
            print(f"✅ Successfully deleted {count} ghost notifications.")
            
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    cleanup_orphans()
