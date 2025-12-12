import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path to import app
sys.path.append(os.getcwd())

# Database URL from your config (assuming standard local or from env)
# You can check .env or hardcode the one you are using locally
# It looks like: sqlite:///./chatnalyxer.db
DATABASE_URL = "sqlite:///./chatnalyxer.db"

def migrate():
    print("🚀 Starting migration: Adding user_id to groups table...")
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # 1. Add the column if it doesn't exist
            print("Adding 'user_id' column to 'groups' table...")
            try:
                conn.execute(text("ALTER TABLE groups ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                print("✅ Column added successfully.")
            except Exception as e:
                print(f"⚠️  Column might already exist: {e}")

            # 2. Populate the column based on GroupMember (assuming 1-to-1 or taking first member)
            print("Populating 'user_id' from 'group_members'...")
            # This query grabs the user_id from the first found member for each group
            # If multiple members exist, this takes one. Given the app logic, groups are usually user-specific.
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
            print(f"✅ Updated {result.rowcount} groups with user ownership.")
            
            conn.commit()
            print("🎉 Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate()
