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

def cleanup_specific_events():
    print(f"🔌 Connecting to database...")
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # IDs identified from previous debug step:
        # 25 | Title: Mean Class
        # 26 | Title: Go to CS Lab
        ids_to_delete = [25, 26]
        
        print(f"🧹 Deleting Events with IDs: {ids_to_delete}...")
        
        # Determine strict or soft delete?
        # app/routers/events.py uses db.delete(event), which is a hard delete in SQLAlchemy unless soft delete mixin is verified.
        # models.Event does NOT have deleted_at. So it is hard delete.
        
        for eid in ids_to_delete:
            session.execute(text("DELETE FROM events WHERE id = :id"), {"id": eid})
            
        session.commit()
        print(f"✅ Successfully deleted events {ids_to_delete}.")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    cleanup_specific_events()
