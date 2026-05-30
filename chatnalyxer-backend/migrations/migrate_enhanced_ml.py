#!/usr/bin/env python3
"""
Migration script to add enhanced ML columns to the messages table.
Run this to add the new message_category and academic_context columns.
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def migrate_enhanced_ml_columns():
    """Add the new enhanced ML columns to the messages table."""

    print("Starting Enhanced ML Migration...")

    if not DATABASE_URL:
        print("Error: DATABASE_URL not set in .env file")
        sys.exit(1)

    engine = create_engine(DATABASE_URL)

    try:
        with engine.begin() as connection:
            print("Checking existing columns...")

            # Check if columns already exist (SQLite approach)
            check_columns_query = "PRAGMA table_info(messages)"
            existing_columns = connection.execute(text(check_columns_query)).fetchall()
            existing_column_names = [row[1] for row in existing_columns]  # Column name is at index 1

            # Add message_category column if it doesn't exist
            if 'message_category' not in existing_column_names:
                print("Adding message_category column...")
                add_category_query = """
                    ALTER TABLE messages
                    ADD COLUMN message_category VARCHAR(20) DEFAULT 'GENERAL' NOT NULL
                """
                connection.execute(text(add_category_query))
                print("message_category column added successfully!")
            else:
                print("message_category column already exists")

            # Add academic_context column if it doesn't exist
            if 'academic_context' not in existing_column_names:
                print("Adding academic_context column...")
                add_context_query = """
                    ALTER TABLE messages
                    ADD COLUMN academic_context TEXT
                """
                connection.execute(text(add_context_query))
                print("academic_context column added successfully!")
            else:
                print("academic_context column already exists")

            # Update existing messages with default values if needed
            print("Updating existing messages with default values...")
            update_query = """
                UPDATE messages
                SET academic_context = '{}'
                WHERE academic_context IS NULL
            """
            result = connection.execute(text(update_query))
            print(f"Updated {result.rowcount} messages with default academic_context")

            print("Enhanced ML Migration completed successfully!")

    except SQLAlchemyError as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_enhanced_ml_columns()