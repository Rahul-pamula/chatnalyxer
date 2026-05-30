#!/usr/bin/env python3
"""
Migrate database - add whatsapp_id column to groups table
"""
from app.database import engine
from sqlalchemy import text

def migrate_groups_table():
    """Add whatsapp_id column to groups table if it doesn't exist"""
    print("Checking groups table schema...")

    with engine.connect() as conn:
        # Check if groups table exists
        result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'groups')"))
        table_exists = result.fetchone()[0]

        if not table_exists:
            print("Groups table doesn't exist. Creating from scratch...")
            from app.models import Base
            Base.metadata.create_all(bind=engine)
            print("Database tables created successfully!")
            return

        print("Adding missing columns to groups table...")

        # Check if whatsapp_id column exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'groups' AND column_name = 'whatsapp_id'
        """))
        whatsapp_id_exists = result.fetchone() is not None

        # Add whatsapp_id column if missing
        if not whatsapp_id_exists:
            conn.execute(text("""
                ALTER TABLE groups
                ADD COLUMN whatsapp_id VARCHAR(255) UNIQUE
            """))

            # Create index on the new column
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_groups_whatsapp_id
                ON groups (whatsapp_id)
            """))

        # Check if is_selected column exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'groups' AND column_name = 'is_selected'
        """))
        is_selected_exists = result.fetchone() is not None

        if not is_selected_exists:
            conn.execute(text("""
                ALTER TABLE groups
                ADD COLUMN is_selected INTEGER DEFAULT 0 NOT NULL
            """))

        # Check if created_at column exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'groups' AND column_name = 'created_at'
        """))
        created_at_exists = result.fetchone() is not None

        if not created_at_exists:
            conn.execute(text("""
                ALTER TABLE groups
                ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            """))

        conn.commit()
        print("Successfully added missing columns to groups table")

if __name__ == "__main__":
    migrate_groups_table()