from sqlalchemy import text
from app.database import engine


def migrate():
    with engine.connect() as conn:
        print("Running migration: Adding consent fields to users table...")

        columns = [
            ("consent_accepted", "BOOLEAN DEFAULT FALSE NOT NULL"),
            ("consent_accepted_at", "TIMESTAMP NULL"),
            ("consent_version", "VARCHAR(50) DEFAULT 'v1' NOT NULL"),
            ("consent_whatsapp", "BOOLEAN DEFAULT FALSE NOT NULL"),
            ("consent_email", "BOOLEAN DEFAULT FALSE NOT NULL"),
        ]

        for col, ddl in columns:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {ddl}"))
                print(f"✅ Added column: {col}")
            except Exception as e:
                if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                    print(f"ℹ️ Column {col} already exists.")
                else:
                    print(f"❌ Error adding {col}: {e}")

        conn.commit()


if __name__ == "__main__":
    migrate()
