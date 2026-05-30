"""
Database migration for notifications system
Run this script to add notifications table and update users table
"""

import os
from dotenv import load_dotenv
import psycopg2

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    """
    Add notifications_enabled to users table and create notifications table
    """
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("🔄 Starting notifications migration...")
        
        # 1. Add notifications_enabled to users table
        print("📝 Adding notifications_enabled column to users table...")
        cur.execute("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL;
        """)
        
        # 2. Check if notifications table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'notifications'
            );
        """)
        table_exists = cur.fetchone()[0]
        
        if table_exists:
            print("📝 Notifications table exists, updating columns...")
            # Add missing columns to existing table
            cur.execute("""
                ALTER TABLE notifications 
                ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE NOT NULL,
                ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS priority VARCHAR(20);
            """)
        else:
            print("📝 Creating notifications table...")
            # Create new table
            cur.execute("""
                CREATE TABLE notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    body TEXT NOT NULL,
                    priority VARCHAR(20),
                    is_read BOOLEAN DEFAULT FALSE NOT NULL,
                    read_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
        
        # 3. Create indexes for better performance
        print("📝 Creating indexes...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
            ON notifications(user_id);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
            ON notifications(is_read);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
            ON notifications(created_at DESC);
        """)
        
        # Commit changes
        conn.commit()
        
        print("✅ Migration completed successfully!")
        print("   - Added notifications_enabled to users table")
        if table_exists:
            print("   - Updated existing notifications table")
        else:
            print("   - Created notifications table")
        print("   - Created performance indexes")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
