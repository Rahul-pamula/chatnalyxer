from sqlalchemy import create_engine, text
from app.config import settings

def migrate_email():
    """Add email support columns and table"""
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # 1. Add columns to analyzed_messages
        try:
            conn.execute(text("ALTER TABLE analyzed_messages ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'whatsapp'"))
            conn.execute(text("ALTER TABLE analyzed_messages ADD COLUMN IF NOT EXISTS email_id VARCHAR(255)"))
            conn.execute(text("ALTER TABLE analyzed_messages ADD COLUMN IF NOT EXISTS subject TEXT"))
            print("✅ analyzed_messages table updated")
        except Exception as e:
            print(f"⚠️ analyzed_messages update failed: {e}")

        # 2. Create email_credentials table
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS email_credentials (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    email_address VARCHAR(255) NOT NULL,
                    app_password VARCHAR(255) NOT NULL,
                    provider VARCHAR(50) DEFAULT 'gmail',
                    is_active BOOLEAN DEFAULT TRUE,
                    last_synced TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            print("✅ email_credentials table created")
        except Exception as e:
            print(f"⚠️ email_credentials creation failed: {e}")

if __name__ == "__main__":
    migrate_email()
