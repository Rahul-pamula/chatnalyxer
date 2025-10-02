#!/usr/bin/env python3
"""
PostgreSQL Database Migration Script: Add ML-based Priority Detection Columns
This script adds the necessary ML columns to the messages table for priority detection functionality.
"""
import os
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

def get_db_connection():
    """Get database connection from environment variables."""
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise ValueError("DATABASE_URL is not set in .env")

    # Parse the database URL
    parsed = urlparse(database_url)

    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port,
        database=parsed.path[1:],  # Remove leading slash
        user=parsed.username,
        password=parsed.password
    )

    return conn

def run_migration():
    """Add ML-related columns to the messages table."""

    print("Starting PostgreSQL database migration for ML columns...")

    try:
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()

        print("Connected to PostgreSQL database successfully")

        # Check if columns already exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'messages' AND table_schema = 'public';
        """)

        existing_columns = [row[0] for row in cursor.fetchall()]

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
            ("deadline_extracted", "TIMESTAMP WITH TIME ZONE NULL"),
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
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'messages' AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)

        print("\nUpdated table schema:")
        for col in cursor.fetchall():
            col_name = col[0]
            if col_name in ml_columns:
                print(f"  ML: {col_name}: {col[1]} (Default: {col[2]})")
            else:
                print(f"     {col_name}: {col[1]}")

        print("\nMigration completed successfully!")
        print("The priority messages endpoint should now work correctly.")

        return True

    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()

def verify_migration():
    """Verify that the migration was successful by testing the columns."""

    try:
        conn = get_db_connection()
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
            cursor.close()
            conn.close()

if __name__ == "__main__":
    print("PostgreSQL ML Database Migration Tool")
    print("=" * 50)

    try:
        success = run_migration()

        if success:
            print("\nVerifying migration...")
            verify_migration()
            print("\nMigration complete! You can now:")
            print("   1. Restart the backend server (if needed)")
            print("   2. Test the priority messages endpoint")
            print("   3. Send WhatsApp messages to see ML analysis in action")
        else:
            print("\nMigration failed. Please check the error messages above.")

    except Exception as e:
        print(f"\nFailed to connect to database: {str(e)}")
        print("Make sure:")
        print("   1. The DATABASE_URL in .env is correct")
        print("   2. The database server is accessible")
        print("   3. You have the required permissions")