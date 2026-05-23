from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        print("Running migration: Creating user_profiles table...")
        
        # Create user_profiles table
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_profiles (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    user_type VARCHAR(50) DEFAULT 'CASUAL' NOT NULL,
                    profile_data JSONB DEFAULT '{}',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("✅ Created table: user_profiles")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("ℹ️ Table user_profiles already exists.")
            else:
                print(f"❌ Error creating user_profiles: {e}")
        
        conn.commit()

if __name__ == "__main__":
    migrate()
