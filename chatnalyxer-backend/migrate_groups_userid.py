import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path to import app
sys.path.append(os.getcwd())

# Database URL from your config (assuming standard local or from env)
# You can check .env or hardcode the one you are using locally
# It looks like: sqlite:///./chatnalyxer.db
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chatnalyxer.db")

def migrate():
    print("🚀 Starting migration: Adding user_id to groups table...")
    
    engine = create_engine(DATABASE_URL)
    
    # Create a raw connection for better transaction control or use engine.connect()
    # For simplicity and robustness with the existing logic:
    with engine.connect() as conn:
        # Separate the Schema Change (DDL) and Data Update (DML) into distinct attempts
        # to avoid "current transaction is aborted" errors in Postgres.

        # ---------------------------------------------------------
        # Step 1: Add Column
        # ---------------------------------------------------------
        print("Adding 'user_id' column to 'groups' table...")
        trans = conn.begin() # Start transaction
        try:
            conn.execute(text("ALTER TABLE groups ADD COLUMN user_id INTEGER REFERENCES users(id)"))
            trans.commit()
            print("✅ Column added successfully.")
        except Exception as e:
            trans.rollback() # Important: Rollback if it fails (e.g. column exists)
            print(f"⚠️  Column adding skipped (might already exist): {e}")

    with engine.connect() as conn:
        # ---------------------------------------------------------
        # Step 2: Populate Data
        # ---------------------------------------------------------
        print("Populating 'user_id' from 'group_members'...")
        trans = conn.begin()
        try:
            update_query = text("""
                UPDATE groups
                SET user_id = (
                    SELECT user_id 
                    FROM group_members 
                    WHERE group_members.group_id = groups.id 
                    LIMIT 1
                )
                WHERE user_id IS NULL;
            """)
            result = conn.execute(update_query)
            trans.commit()
            print(f"✅ Updated {result.rowcount} groups with user ownership.")
        except Exception as e:
            trans.rollback()
            print(f"❌ Data population failed: {e}")
            # Don't raise, so main execution continues cleanly

    print("🎉 Migration sequence finished.")

if __name__ == "__main__":
    migrate()
