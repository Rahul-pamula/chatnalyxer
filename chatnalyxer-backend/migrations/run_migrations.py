import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ Error: DATABASE_URL not found in .env")
    exit(1)

# Fix for SQLAlchemy postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Add SSL mode for Supabase
if "sslmode" not in DATABASE_URL:
    DATABASE_URL += "?sslmode=require"

def run_migrations():
    print(f"🔌 Connecting to database...")
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            print("📂 Reading migration file...")
            with open("migrations/add_ai_tables.sql", "r") as f:
                sql_script = f.read()
            
            print("🚀 Executing migration...")
            # Split by statement if needed, but for simple creation blocks usually fine as one
            # or we can execute entire block
            conn.execute(text(sql_script))
            conn.commit()
            
            print("✅ Migration successful! AI tables created.")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    run_migrations()
