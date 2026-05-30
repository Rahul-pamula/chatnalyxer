#!/usr/bin/env python3
"""
Script to reprocess existing messages with the improved ML analyzer
"""

import sqlite3
import sys
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, 'app')

from app.services.ml_analyzer import MLMessageAnalyzer

def reprocess_all_messages():
    """Reprocess all existing messages with the improved ML analyzer"""

    try:
        # Connect to database
        conn = sqlite3.connect('chatnalyxer.db')
        cursor = conn.cursor()

        # Initialize ML analyzer
        analyzer = MLMessageAnalyzer()

        print("Reprocessing existing messages with improved ML analyzer...")
        print("=" * 70)

        # Get all messages
        cursor.execute("""
            SELECT id, content, created_at
            FROM messages
            ORDER BY created_at DESC
        """)

        messages = cursor.fetchall()
        updated_count = 0

        for msg_id, content, created_at_str in messages:
            # Parse the created_at datetime
            created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))

            # Analyze message with improved ML
            result = analyzer.analyze_message(content, created_at)

            # Update message in database
            cursor.execute("""
                UPDATE messages
                SET
                    priority_level = ?,
                    urgency_score = ?,
                    deadline_extracted = ?,
                    extracted_keywords = ?,
                    is_priority = ?,
                    message_category = ?,
                    academic_context = ?
                WHERE id = ?
            """, (
                result['priority_level'],
                result['urgency_score'],
                result['deadline_extracted'],
                result['extracted_keywords'],
                result['is_priority'],
                result.get('message_category', 'GENERAL'),
                result.get('academic_context', '{}'),
                msg_id
            ))

            updated_count += 1

            # Show progress
            print(f"Updated message {msg_id}: '{content[:40]}...' -> "
                  f"Priority: {result['priority_level']}, "
                  f"Is Priority: {'YES' if result['is_priority'] else 'NO'}")

        # Commit changes
        conn.commit()

        # Show summary
        cursor.execute("SELECT COUNT(*) FROM messages WHERE is_priority = 1")
        priority_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM messages WHERE is_priority = 0")
        normal_count = cursor.fetchone()[0]

        print(f"\nReprocessing completed!")
        print(f"Updated {updated_count} messages")
        print(f"Priority messages: {priority_count}")
        print(f"Normal messages: {normal_count}")

        conn.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reprocess_all_messages()