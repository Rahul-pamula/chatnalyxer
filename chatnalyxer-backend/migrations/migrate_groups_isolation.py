import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path to import app
sys.path.append(os.getcwd())

# Database URL from env or default
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chatnalyxer.db")

def migrate():
    print("🚀 Starting migration: Isolating groups per user...")
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("Dropping global unique constraint on 'whatsapp_id'...")
        trans = conn.begin()
        try:
            # 1. Drop existing unique constraint on whatsapp_id
            # Note: The constraint name might vary. In Postgres, typically 'groups_whatsapp_id_key'.
            # We try standard name. If it fails, we might need to inspect.
            conn.execute(text("ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_whatsapp_id_key"))
            
            # Also try the potential index name if created implicitly
            conn.execute(text("DROP INDEX IF EXISTS groups_whatsapp_id_key"))
            
            trans.commit()
            print("✅ Global uniqueness constraint dropped.")
        except Exception as e:
            trans.rollback()
            print(f"⚠️  Drop constraint warning (might not exist): {e}")

    with engine.connect() as conn:
        print("Adding composite unique constraint (user_id, whatsapp_id)...")
        trans = conn.begin()
        try:
            # 2. Add new composite unique constraint
            conn.execute(text("ALTER TABLE groups ADD CONSTRAINT groups_user_whatsapp_unique UNIQUE (user_id, whatsapp_id)"))
            trans.commit()
            print("✅ Composite unique constraint added.")
        except Exception as e:
            trans.rollback()
            print(f"⚠️  Add constraint warning (might already exist): {e}")

    print("🎉 Group isolation migration finished.")

if __name__ == "__main__":
    migrate()
