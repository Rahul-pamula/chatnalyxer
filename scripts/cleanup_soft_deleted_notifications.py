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

def force_clean_notifications():
    print(f"🔌 Connecting to database...")
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Delete notification where related message is trash
        print("🔍 Checking for orphaned notifications (related message is deleted)...")
        
        result = session.execute(text("""
            DELETE FROM notifications 
            WHERE related_message_id IN (
                SELECT id FROM messages WHERE deleted_at IS NOT NULL
            )
        """))
        print(f"✅ Deleted {result.rowcount} notifications linked to soft-deleted messages.")
        session.commit()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    force_clean_notifications()
