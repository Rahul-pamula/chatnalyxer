#!/usr/bin/env python3
"""
Database Migration Script: Add ML-based Priority Detection Columns
This script adds the necessary ML columns to the messages table for priority detection functionality.
"""
import sqlite3
import os
from datetime import datetime

def run_migration():
    """Add ML-related columns to the messages table."""

    # Database path
    db_path = "app/chatnalyxer.db"

    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        print("Make sure the backend has been started at least once to create the database.")
        return False

    print("Starting database migration for ML columns...")
    print(f"Database: {db_path}")

    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if columns already exist
        cursor.execute("PRAGMA table_info(messages)")
        existing_columns = [col[1] for col in cursor.fetchall()]

        ml_columns = ['priority_level', 'urgency_score', 'deadline_extracted', 'extracted_keywords', 'is_priority']
        missing_columns = [col for col in ml_columns if col not in existing_columns]

        if not missing_columns:
            print("All ML columns already exist in the database!")
            return True

        print(f"Adding missing columns: {missing_columns}")

        # Add ML columns one by one
        migrations = [
            ("priority_level", "VARCHAR(10) DEFAULT 'MEDIUM' NOT NULL"),
            ("urgency_score", "FLOAT DEFAULT 0.5 NOT NULL"),
            ("deadline_extracted", "DATETIME NULL"),
            ("extracted_keywords", "TEXT NULL"),
            ("is_priority", "INTEGER DEFAULT 0 NOT NULL")
        ]

        for column_name, column_def in migrations:
            if column_name in missing_columns:
                print(f"  Adding column: {column_name}")
                cursor.execute(f"ALTER TABLE messages ADD COLUMN {column_name} {column_def}")

        # Commit changes
        conn.commit()

        # Verify columns were added
        cursor.execute("PRAGMA table_info(messages)")
        updated_columns = [col[1] for col in cursor.fetchall()]

        print("\nUpdated table schema:")
        cursor.execute("PRAGMA table_info(messages)")
        for col in cursor.fetchall():
            col_name = col[1]
            if col_name in ml_columns:
                print(f"  ML: {col_name}: {col[2]} (ML Column)")
            else:
                print(f"     {col_name}: {col[2]}")

        print("\nMigration completed successfully!")
        print("The priority messages endpoint should now work correctly.")

        return True

    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

    finally:
        if 'conn' in locals():
            conn.close()

def verify_migration():
    """Verify that the migration was successful by testing the columns."""

    db_path = "app/chatnalyxer.db"

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Test querying with the new columns
        cursor.execute("SELECT priority_level, urgency_score, is_priority FROM messages LIMIT 1")

        print("Testing ML columns access...")
        print("ML columns are accessible and ready for use!")

        # Check if there are any existing messages
        cursor.execute("SELECT COUNT(*) FROM messages")
        count = cursor.fetchone()[0]

        if count > 0:
            print(f"Found {count} existing messages - they will have default ML values")
            print("   New messages from WhatsApp will be automatically analyzed with ML")
        else:
            print("No existing messages found - ready for new ML-analyzed messages")

        return True

    except Exception as e:
        print(f"Migration verification failed: {str(e)}")
        return False

    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("ML Database Migration Tool")
    print("=" * 50)

    success = run_migration()

    if success:
        print("\nVerifying migration...")
        verify_migration()
        print("\nMigration complete! You can now:")
        print("   1. Restart the backend server")
        print("   2. Test the priority messages endpoint")
        print("   3. Send WhatsApp messages to see ML analysis in action")
    else:
        print("\nTry running the backend server first to create the database, then run this migration.")