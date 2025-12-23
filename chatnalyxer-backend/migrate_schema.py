"""
Database Migration Script
Adds missing group_members table and deleted_at column to messages
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

print("🔧 Running database migrations...")

with engine.connect() as conn:
    # 1. Create group_members table if it doesn't exist
    print("📋 Creating group_members table...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS group_members (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            UNIQUE(user_id, group_id)
        );
    """))
    conn.commit()
    print("✅ group_members table created")
    
    # 2. Add deleted_at column to messages if it doesn't exist
    print("📋 Adding deleted_at column to messages...")
    try:
        conn.execute(text("""
            ALTER TABLE messages 
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        """))
        conn.commit()
        print("✅ deleted_at column added")
    except Exception as e:
        print(f"⚠️ deleted_at column might already exist: {e}")
    
    # 3. Populate group_members from existing groups
    print("📋 Populating group_members from existing groups...")
    result = conn.execute(text("""
        INSERT INTO group_members (user_id, group_id)
        SELECT DISTINCT user_id, id 
        FROM groups 
        WHERE user_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.user_id = groups.user_id 
            AND gm.group_id = groups.id
        );
    """))
    conn.commit()
    print(f"✅ Created {result.rowcount} group memberships")
    
    # 4. Verify the fix
    print("\n📊 Verification:")
    
    # Check group_members count
    result = conn.execute(text("SELECT COUNT(*) FROM group_members;"))
    count = result.scalar()
    print(f"   - group_members: {count} rows")
    
    # Check messages with selected groups
    result = conn.execute(text("""
        SELECT COUNT(*) 
        FROM messages m
        JOIN groups g ON m.group_id = g.id
        WHERE g.is_selected = 1 AND m.deleted_at IS NULL;
    """))
    count = result.scalar()
    print(f"   - Messages in selected groups: {count}")
    
    # Check if query will work
    result = conn.execute(text("""
        SELECT COUNT(*)
        FROM messages m
        JOIN groups g ON m.group_id = g.id
        JOIN group_members gm ON g.id = gm.group_id
        WHERE g.is_selected = 1 
        AND m.deleted_at IS NULL
        AND m.priority_level IN ('HIGH', 'MEDIUM');
    """))
    count = result.scalar()
    print(f"   - Messages that will show in dashboard: {count}")

print("\n✅ Migration complete! Restart your app to see messages in the dashboard.")
