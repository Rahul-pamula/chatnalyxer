"""
Add user_profiles table and user_type/profile_data columns
Run this migration on PostgreSQL database
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Connect to PostgreSQL
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

try:
    print("🔄 Running migration...")
    
    # Add columns to users table if they don't exist
    print("1. Adding user_type column to users table...")
    cur.execute("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'CASUAL' NOT NULL;
    """)
    
    print("2. Adding profile_data column to users table...")
    cur.execute("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;
    """)
    
    # Create user_profiles table
    print("3. Creating user_profiles table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE,
            user_type VARCHAR(50) DEFAULT 'CASUAL' NOT NULL,
            profile_data JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    
    print("4. Creating index on user_profiles.user_id...")
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
    """)
    
    conn.commit()
    print("✅ Migration completed successfully!")
    
except Exception as e:
    conn.rollback()
    print(f"❌ Migration failed: {e}")
    raise
finally:
    cur.close()
    conn.close()
