#!/usr/bin/env python3
"""
Script to clear all messages from the database
"""

import sqlite3
import sys

def clear_all_messages():
    """Clear all messages from the database"""

    try:
        # Connect to database
        conn = sqlite3.connect('chatnalyxer.db')
        cursor = conn.cursor()

        print("Clearing all messages from database...")
        print("=" * 50)

        # Count existing messages before deletion
        cursor.execute("SELECT COUNT(*) FROM messages")
        message_count = cursor.fetchone()[0]

        if message_count == 0:
            print("No messages found in database.")
            return

        print(f"Found {message_count} messages in database")

        # Ask for confirmation
        print(f"\nThis will permanently delete all {message_count} messages.")
        confirm = input("Are you sure you want to continue? (yes/no): ").lower().strip()

        if confirm not in ['yes', 'y']:
            print("Operation cancelled.")
            return

        # Delete all messages
        cursor.execute("DELETE FROM messages")
        deleted_count = cursor.rowcount

        # Reset the auto-increment counter (check if table exists first)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'")
        if cursor.fetchone():
            cursor.execute("DELETE FROM sqlite_sequence WHERE name='messages'")

        # Commit changes
        conn.commit()

        print(f"\nSuccessfully deleted {deleted_count} messages!")
        print("Database is now clean and ready for new messages.")
        print("The dashboard will show no messages until new ones arrive from WhatsApp.")

        conn.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clear_all_messages()