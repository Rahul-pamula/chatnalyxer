"""
Check if message 298 still exists in database
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
    # Check message 298
    result = conn.execute(text("""
        SELECT id, content, deleted_at, priority_level
        FROM messages
        WHERE id = 298;
    """))
    row = result.fetchone()
    
    if row:
        print(f"Message 298 exists:")
        print(f"  Content: {row[1][:50]}...")
        print(f"  Deleted: {row[2]}")
        print(f"  Priority: {row[3]}")
        
        if row[2]:
            print("\n✅ Message IS deleted (in trash)")
        else:
            print("\n❌ Message is NOT deleted")
    else:
        print("Message 298 not found in database")
