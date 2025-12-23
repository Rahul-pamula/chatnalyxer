"""
Test if user 36 has access to message 298's group
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Get message 298's group
    result = conn.execute(text("""
        SELECT m.id, m.group_id, g.name
        FROM messages m
        JOIN groups g ON m.group_id = g.id
        WHERE m.id = 298;
    """))
    row = result.fetchone()
    
    if row:
        msg_id, group_id, group_name = row
        print(f"Message 298 is in group {group_id} ({group_name})")
        
        # Check if user 36 is a member
        result = conn.execute(text("""
            SELECT * FROM group_members
            WHERE user_id = 36 AND group_id = :gid;
        """), {"gid": group_id})
        
        if result.fetchone():
            print(f"✅ User 36 IS a member of group {group_id}")
        else:
            print(f"❌ User 36 is NOT a member of group {group_id}")
            print("\nThis is why delete is failing!")
