#!/usr/bin/env python3
"""
Fix Invalid Email Addresses in Database
This script updates email addresses that don't pass Pydantic EmailStr validation.
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

def fix_invalid_emails():
    """Fix email addresses that fail Pydantic EmailStr validation."""

    print("Starting email address fix...")

    try:
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()

        print("Connected to PostgreSQL database successfully")

        # Find users with invalid email addresses
        cursor.execute("""
            SELECT id, email, username
            FROM users
            WHERE email LIKE '%@system.local%' OR email LIKE '%@example.com%'
        """)

        invalid_users = cursor.fetchall()

        if not invalid_users:
            print("No invalid email addresses found!")
            return True

        print(f"Found {len(invalid_users)} users with invalid email addresses:")
        for user in invalid_users:
            print(f"  User {user[0]}: {user[2]} ({user[1]})")

        # Update invalid email addresses
        for user_id, old_email, username in invalid_users:
            if "@system.local" in old_email:
                new_email = old_email.replace("@system.local", "@chatnalyxer.com")
            elif "@example.com" in old_email:
                new_email = old_email.replace("@example.com", "@chatnalyxer.com")
            else:
                continue

            print(f"  Updating user {user_id}: {old_email} -> {new_email}")
            cursor.execute(
                "UPDATE users SET email = %s WHERE id = %s",
                (new_email, user_id)
            )

        # Commit changes
        conn.commit()

        print(f"\nSuccessfully updated {len(invalid_users)} email addresses!")
        print("All emails should now pass Pydantic EmailStr validation.")

        return True

    except Exception as e:
        print(f"Email fix failed: {str(e)}")
        return False

    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    print("Email Address Fix Tool")
    print("=" * 50)

    try:
        success = fix_invalid_emails()

        if success:
            print("\nEmail addresses fixed successfully!")
            print("You can now test the priority messages endpoint.")
        else:
            print("\nEmail fix failed. Please check the error messages above.")

    except Exception as e:
        print(f"\nFailed to fix email addresses: {str(e)}")
        print("Make sure:")
        print("   1. The DATABASE_URL in .env is correct")
        print("   2. The database server is accessible")
        print("   3. You have the required permissions")