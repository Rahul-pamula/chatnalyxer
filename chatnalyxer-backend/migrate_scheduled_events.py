"""
Database Migration: Add scheduled_events table

This migration creates the scheduled_events table for automatic event scheduling
when AI detects deadlines in messages.
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL is not set in .env")

# Fix for Render/Heroku protocols
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def migrate():
    """Add scheduled_events table"""
    print("🚀 Starting migration: Adding scheduled_events table...")
    
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Check if table already exists
            print("🔍 Checking if scheduled_events table exists...")
            
            # For PostgreSQL
            if 'postgresql' in DATABASE_URL:
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_name='scheduled_events'
                """))
                
                if result.fetchone():
                    print("✅ Table already exists, skipping migration")
                    return
                
                print("➕ Creating scheduled_events table...")
                conn.execute(text("""
                    CREATE TABLE scheduled_events (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        message_id INTEGER NOT NULL REFERENCES messages(id),
                        title VARCHAR(500) NOT NULL,
                        description TEXT,
                        deadline TIMESTAMP WITH TIME ZONE NOT NULL,
                        notify_1h_before BOOLEAN DEFAULT TRUE,
                        notify_1d_before BOOLEAN DEFAULT TRUE,
                        notification_sent_1h BOOLEAN DEFAULT FALSE,
                        notification_sent_1d BOOLEAN DEFAULT FALSE,
                        is_completed BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        completed_at TIMESTAMP WITH TIME ZONE
                    )
                """))
                
                # Create indexes
                conn.execute(text("""
                    CREATE INDEX idx_scheduled_events_user_id ON scheduled_events(user_id);
                    CREATE INDEX idx_scheduled_events_deadline ON scheduled_events(deadline);
                    CREATE INDEX idx_scheduled_events_is_completed ON scheduled_events(is_completed);
                """))
                
                conn.commit()
                
            # For SQLite
            else:
                try:
                    print("➕ Creating scheduled_events table...")
                    conn.execute(text("""
                        CREATE TABLE scheduled_events (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL REFERENCES users(id),
                            message_id INTEGER NOT NULL REFERENCES messages(id),
                            title VARCHAR(500) NOT NULL,
                            description TEXT,
                            deadline TIMESTAMP NOT NULL,
                            notify_1h_before BOOLEAN DEFAULT 1,
                            notify_1d_before BOOLEAN DEFAULT 1,
                            notification_sent_1h BOOLEAN DEFAULT 0,
                            notification_sent_1d BOOLEAN DEFAULT 0,
                            is_completed BOOLEAN DEFAULT 0,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            completed_at TIMESTAMP
                        )
                    """))
                    conn.commit()
                except Exception as e:
                    if "already exists" in str(e).lower():
                        print("✅ Table already exists, skipping migration")
                        return
                    raise
            
            print("✅ Migration complete: scheduled_events table created successfully")
            print("📅 Events will now be automatically created when deadlines are detected")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise


if __name__ == "__main__":
    migrate()
