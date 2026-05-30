"""
Database migration for events table
Run this script to add events table
"""

import os
from dotenv import load_dotenv
import psycopg2

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    """
    Create events table
    """
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("🔄 Starting events migration...")
        
        # Create events table
        print("📝 Creating events table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                event_date DATE NOT NULL,
                event_time TIME NOT NULL,
                event_type VARCHAR(50),
                location VARCHAR(255),
                source VARCHAR(50) DEFAULT 'manual',
                source_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        
        # Create indexes
        print("📝 Creating indexes...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_user_id 
            ON events(user_id);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_date 
            ON events(event_date);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_source 
            ON events(source);
        """)
        
        # Commit changes
        conn.commit()
        
        print("✅ Migration completed successfully!")
        print("   - Created events table")
        print("   - Created performance indexes")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
