"""
Fix group_members for user 36
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

print("🔧 Fixing group_members for user 36...")

with engine.connect() as conn:
    # Get user 36's groups
    result = conn.execute(text("""
        SELECT id, name FROM groups WHERE user_id = 36;
    """))
    groups = result.fetchall()
    print(f"Found {len(groups)} groups for user 36")
    
    # Insert memberships
    for group in groups:
        conn.execute(text("""
            INSERT INTO group_members (user_id, group_id)
            VALUES (36, :group_id)
            ON CONFLICT DO NOTHING;
        """), {"group_id": group[0]})
    
    conn.commit()
    print(f"✅ Created memberships for user 36")
    
    # Verify
    result = conn.execute(text("""
        SELECT COUNT(*) FROM group_members WHERE user_id = 36;
    """))
    count = result.scalar()
    print(f"✅ User 36 now has {count} group memberships")
