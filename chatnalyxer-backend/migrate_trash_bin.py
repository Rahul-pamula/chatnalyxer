#!/usr/bin/env python3
"""
Migrate database - add deleted_at column to messages table for trash bin functionality
"""
from app.database import engine
from sqlalchemy import text


def migrate_messages_table():
    """Add deleted_at column to messages table if it doesn't exist"""
    print("Checking messages table schema...")

    with engine.connect() as conn:
        # Check if messages table exists
        result = conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages')"))
        table_exists = result.fetchone()[0]

        if not table_exists:
            print("Messages table doesn't exist. Creating from scratch...")
            from app.models import Base
            Base.metadata.create_all(bind=engine)
            print("Database tables created successfully!")
            return

        print("Adding deleted_at column to messages table...")

        # Check if deleted_at column exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'messages' AND column_name = 'deleted_at'
        """))
        deleted_at_exists = result.fetchone() is not None

        # Add deleted_at column if missing
        if not deleted_at_exists:
            conn.execute(text("""
                ALTER TABLE messages
                ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL
            """))

            print("Successfully added deleted_at column to messages table")
        else:
            print("deleted_at column already exists")

        conn.commit()


if __name__ == "__main__":
    migrate_messages_table()
