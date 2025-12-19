"""
Add missing ai_summary column to messages table

Run this migration to fix the database schema
"""

from sqlalchemy import create_engine, text
import os

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/chatnalyxer")

def run_migration():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='messages' AND column_name='ai_summary'
        """))
        
        if result.fetchone() is None:
            print("Adding ai_summary column to messages table...")
            conn.execute(text("""
                ALTER TABLE messages 
                ADD COLUMN ai_summary VARCHAR(500)
            """))
            conn.commit()
            print("✅ Migration complete!")
        else:
            print("✅ Column already exists, no migration needed")

if __name__ == "__main__":
    run_migration()
