"""
Quick database migration to add missing ai_summary column
Run from the backend directory
"""
import sys
sys.path.append('.')

from app.database import engine
from sqlalchemy import text

def add_ai_summary_column():
    with engine.connect() as conn:
        try:
            # Add the column if it doesn't exist
            conn.execute(text("""
                ALTER TABLE messages 
                ADD COLUMN IF NOT EXISTS ai_summary VARCHAR(500)
            """))
            conn.commit()
            print("✅ Successfully added ai_summary column to messages table!")
        except Exception as e:
            print(f"❌ Error: {e}")
            print("Note: Column might already exist")

if __name__ == "__main__":
    add_ai_summary_column()
