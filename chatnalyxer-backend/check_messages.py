#!/usr/bin/env python3
"""
Quick script to check message priorities in the database
"""

import sqlite3
import sys
from datetime import datetime

def check_messages():
    """Check the priority classification of recent messages"""

    try:
        # Connect to the database
        conn = sqlite3.connect('chatnalyxer.db')
        cursor = conn.cursor()

        print("Recent Messages Analysis:")
        print("=" * 80)

        # Get recent messages with their ML analysis
        cursor.execute("""
            SELECT
                content,
                priority_level,
                urgency_score,
                is_priority,
                message_category,
                created_at
            FROM messages
            ORDER BY created_at DESC
            LIMIT 10
        """)

        messages = cursor.fetchall()

        if not messages:
            print("No messages found in database")
            return

        for i, (content, priority, score, is_priority, category, created_at) in enumerate(messages, 1):
            print(f"\n{i}. MESSAGE:")
            print(f"   Content: {content[:60]}{'...' if len(content) > 60 else ''}")
            print(f"   Priority Level: {priority}")
            print(f"   Urgency Score: {score:.2f}")
            print(f"   Is Priority: {bool(is_priority)} ({'YES' if is_priority else 'NO'})")
            print(f"   Category: {category or 'N/A'}")
            print(f"   Created: {created_at}")

        # Count priority vs non-priority messages
        cursor.execute("SELECT COUNT(*) FROM messages WHERE is_priority = 1")
        priority_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM messages WHERE is_priority = 0")
        normal_count = cursor.fetchone()[0]

        print(f"\nSUMMARY:")
        print(f"   Priority Messages: {priority_count}")
        print(f"   Normal Messages: {normal_count}")
        print(f"   Total Messages: {priority_count + normal_count}")

        conn.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_messages()