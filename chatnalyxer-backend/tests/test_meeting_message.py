#!/usr/bin/env python3
"""
Test the enhanced ML analyzer specifically for meeting messages
"""

import sys
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, 'app')

from app.services.ml_analyzer import MLMessageAnalyzer

def test_meeting_messages():
    """Test the ML analyzer with meeting-related messages"""

    analyzer = MLMessageAnalyzer()

    # Test messages including the one that didn't work
    test_messages = [
        "we have meeting tomorrow at 9am in erp class",
        "Meeting tomorrow 10am in lab",
        "Important meeting today 2pm",
        "Faculty meeting at 3pm",
        "Project meeting kal 11am",
        "Group meeting tomorrow",
        "meeting",  # Simple word should not be priority
        "lets meet",  # Casual should not be priority
        "Class meeting tomorrow 9am compulsory attendance"
    ]

    print("Testing Enhanced ML Analyzer for Meeting Messages")
    print("=" * 60)

    for i, content in enumerate(test_messages, 1):
        result = analyzer.analyze_message(content, datetime.now())

        print(f"\n{i}. Message: \"{content}\"")
        print(f"   Priority Level: {result['priority_level']}")
        print(f"   Urgency Score: {result['urgency_score']:.2f}")
        print(f"   Is Priority: {'YES' if result['is_priority'] else 'NO'}")
        print(f"   Category: {result.get('message_category', 'N/A')}")

        if result['deadline_extracted']:
            deadline = result['deadline_extracted']
            print(f"   Deadline: {deadline.strftime('%Y-%m-%d %H:%M')}")

        keywords = eval(result['extracted_keywords']) if result['extracted_keywords'] else []
        if keywords:
            print(f"   Keywords: {', '.join(keywords[:5])}")

    print(f"\n{'='*60}")
    print("Testing completed!")

if __name__ == "__main__":
    test_meeting_messages()