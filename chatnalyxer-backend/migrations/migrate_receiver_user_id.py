"""
Database Migration: Add receiver_user_id to messages table

This migration adds a receiver_user_id column to track which user's
WhatsApp session received each message, enabling proper message isolation
between users in shared groups.
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
    """Add receiver_user_id column to messages table"""
    print("🚀 Starting migration: Adding receiver_user_id to messages table...")
    
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Check if column already exists
            print("🔍 Checking if receiver_user_id column exists...")
            
            # For PostgreSQL
            if 'postgresql' in DATABASE_URL:
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='messages' AND column_name='receiver_user_id'
                """))
                
                if result.fetchone():
                    print("✅ Column already exists, skipping migration")
                    return
                
                print("➕ Adding receiver_user_id column...")
                conn.execute(text("""
                    ALTER TABLE messages 
                    ADD COLUMN receiver_user_id INTEGER REFERENCES users(id)
                """))
                conn.commit()
                
            # For SQLite
            else:
                # SQLite doesn't support checking columns easily, try to add and catch error
                try:
                    print("➕ Adding receiver_user_id column...")
                    conn.execute(text("""
                        ALTER TABLE messages 
                        ADD COLUMN receiver_user_id INTEGER REFERENCES users(id)
                    """))
                    conn.commit()
                except Exception as e:
                    if "duplicate column" in str(e).lower():
                        print("✅ Column already exists, skipping migration")
                        return
                    raise
            
            print("✅ Migration complete: receiver_user_id column added successfully")
            print("⚠️  Note: Existing messages will have NULL receiver_user_id")
            print("💡 Recommendation: Clear old messages or assign them to a default user")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise


if __name__ == "__main__":
    migrate()
