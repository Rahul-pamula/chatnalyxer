"""
Database migration for user behavior tracking
Run this script to add user_interactions table
"""

import os
from dotenv import load_dotenv
import psycopg2

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    """
    Add user_interactions table for behavior tracking
    """
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("🔄 Starting user interactions migration...")
        
        # Create user_interactions table
        print("📝 Creating user_interactions table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_interactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                interaction_type VARCHAR(50) NOT NULL,
                interaction_data JSONB DEFAULT '{}',
                notification_id INTEGER REFERENCES notifications(id) ON DELETE SET NULL,
                event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        
        # Create indexes for better performance
        print("📝 Creating indexes...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id 
            ON user_interactions(user_id);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_interactions_type 
            ON user_interactions(interaction_type);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at 
            ON user_interactions(created_at DESC);
        """)
        
        # Add is_read and read_at to notifications if not exists
        print("📝 Updating notifications table...")
        cur.execute("""
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE NOT NULL,
            ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS priority VARCHAR(20);
        """)
        
        # Commit changes
        conn.commit()
        
        print("✅ Migration completed successfully!")
        print("   - Created user_interactions table")
        print("   - Created performance indexes")
        print("   - Updated notifications table")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
