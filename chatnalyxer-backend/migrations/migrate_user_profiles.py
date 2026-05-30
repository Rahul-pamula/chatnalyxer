from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        print("Running migration: Adding user_type and profile_data to users table...")
        
        # Add user_type column
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'CASUAL' NOT NULL"))
            print("✅ Added column: user_type")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ Column user_type already exists.")
            else:
                print(f"❌ Error adding user_type: {e}")

        # Add profile_data column (JSONB)
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN profile_data JSONB DEFAULT '{}'"))
            print("✅ Added column: profile_data")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ Column profile_data already exists.")
            else:
                print(f"❌ Error adding profile_data: {e}")
        
        conn.commit()

if __name__ == "__main__":
    migrate()
