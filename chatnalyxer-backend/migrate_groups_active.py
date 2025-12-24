"""
Migration: Add is_active column to groups table
This allows filtering out deleted WhatsApp groups
"""

from app.database import SessionLocal, engine
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    
    try:
        print("🚀 Starting migration: Adding is_active to groups table...")
        
        # Add is_active column
        print("Adding 'is_active' column...")
        db.execute(text('ALTER TABLE groups ADD COLUMN is_active BOOLEAN DEFAULT TRUE'))
        db.commit()
        print("✅ Column added successfully")
        
        # Set all existing groups to active
        print("Setting existing groups to active...")
        result = db.execute(text('UPDATE groups SET is_active = TRUE WHERE is_active IS NULL'))
        db.commit()
        print(f"✅ Updated {result.rowcount} groups")
        
        print("🎉 Migration completed successfully!")
        
    except Exception as e:
        print(f"⚠️  Migration error: {e}")
        print("   (Column might already exist)")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
