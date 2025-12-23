"""
Debug script to check why messages aren't showing
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

print("🔍 Debugging message display issue...\n")

with engine.connect() as conn:
    # Check selected groups
    print("1️⃣ Selected groups:")
    result = conn.execute(text("""
        SELECT id, name, user_id, is_selected 
        FROM groups 
        WHERE is_selected = 1 
        LIMIT 5;
    """))
    for row in result:
        print(f"   Group {row[0]}: {row[1]} (user_id: {row[2]})")
    
    # Check messages in those groups
    print("\n2️⃣ Messages in selected groups:")
    result = conn.execute(text("""
        SELECT m.id, m.content, m.priority_level, g.name, m.deleted_at
        FROM messages m
        JOIN groups g ON m.group_id = g.id
        WHERE g.is_selected = 1
        LIMIT 5;
    """))
    for row in result:
        print(f"   Msg {row[0]}: {row[2]} - {row[1][:50]}... (deleted: {row[4]})")
    
    # Check group_members for selected groups
    print("\n3️⃣ Group members for selected groups:")
    result = conn.execute(text("""
        SELECT gm.user_id, gm.group_id, g.name
        FROM group_members gm
        JOIN groups g ON gm.group_id = g.id
        WHERE g.is_selected = 1
        LIMIT 5;
    """))
    count = 0
    for row in result:
        print(f"   User {row[0]} -> Group {row[1]} ({row[2]})")
        count += 1
    if count == 0:
        print("   ❌ NO GROUP MEMBERS FOUND FOR SELECTED GROUPS!")
    
    # Check what the actual query returns
    print("\n4️⃣ What the dashboard query returns:")
    result = conn.execute(text("""
        SELECT m.id, m.content, m.priority_level, g.name
        FROM messages m
        JOIN groups g ON m.group_id = g.id
        JOIN group_members gm ON g.id = gm.group_id
        WHERE g.is_selected = 1 
        AND m.deleted_at IS NULL
        AND m.priority_level IN ('HIGH', 'MEDIUM')
        LIMIT 5;
    """))
    count = 0
    for row in result:
        print(f"   Msg {row[0]}: {row[2]} - {row[1][:50]}...")
        count += 1
    if count == 0:
        print("   ❌ QUERY RETURNS NOTHING!")
        print("\n   Possible reasons:")
        print("   - No group_members for selected groups")
        print("   - All messages are LOW priority")
        print("   - Messages have deleted_at set")
