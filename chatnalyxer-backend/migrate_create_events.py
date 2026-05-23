from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        print("Running migration: Creating events table...")
        
        # Create events table
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    event_date DATE NOT NULL,
                    event_time TIME,
                    location VARCHAR(255),
                    reminder_minutes INTEGER DEFAULT 30,
                    is_all_day BOOLEAN DEFAULT FALSE,
                    source VARCHAR(50) DEFAULT 'manual',
                    source_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("✅ Created table: events")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("ℹ️ Table events already exists.")
            else:
                print(f"❌ Error creating events: {e}")
        
        # Create index on user_id and event_date for faster queries
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, event_date)"))
            print("✅ Created index on events(user_id, event_date)")
        except Exception as e:
            print(f"⚠️ Index creation warning: {e}")
        
        conn.commit()

if __name__ == "__main__":
    migrate()
