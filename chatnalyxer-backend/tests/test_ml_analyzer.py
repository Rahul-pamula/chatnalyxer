#!/usr/bin/env python3
"""
Test script for the enhanced ML analyzer with Indian student WhatsApp messages.
"""

import sys
import os
from datetime import datetime, timedelta

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.ml_analyzer import MLMessageAnalyzer

def test_indian_student_messages():
    """Test the ML analyzer with various Indian student message patterns."""

    analyzer = MLMessageAnalyzer()

    # Sample messages that Indian students typically send in WhatsApp groups
    test_messages = [
        {
            "content": "Sir class cancel today?? Koi aaya hai??",
            "description": "Class cancellation inquiry (SHOULD BE PRIORITY)"
        },
        {
            "content": "Assignment submit tomorrow tak hai sir ne bola tha. Koi remember kar raha hai??",
            "description": "Assignment deadline reminder (SHOULD BE PRIORITY)"
        },
        {
            "content": "Exam hai kal yaar! Koi notes bhej sakta hai??",
            "description": "Exam tomorrow with request for notes (SHOULD BE PRIORITY)"
        },
        {
            "content": "Testing",
            "description": "Simple test word (SHOULD NOT BE PRIORITY)"
        },
        {
            "content": "test",
            "description": "Single word test (SHOULD NOT BE PRIORITY)"
        },
        {
            "content": "Project report submit karna hai abhi jaldi!! Deadline aa gaya hai",
            "description": "Urgent project submission (SHOULD BE PRIORITY)"
        },
        {
            "content": "Class hai ya nahi aaj?? Sir ka message aaya kya??",
            "description": "Class confirmation query (SHOULD BE PRIORITY)"
        },
        {
            "content": "Submit kar do assignment 5 baje tak. Lab mein sir waiting kar rahe hai",
            "description": "Immediate submission with time deadline (SHOULD BE PRIORITY)"
        },
        {
            "content": "hi",
            "description": "Casual greeting (SHOULD NOT BE PRIORITY)"
        },
        {
            "content": "ok",
            "description": "Simple acknowledgment (SHOULD NOT BE PRIORITY)"
        },
        {
            "content": "Happy birthday yaar! Party kab de rahe ho??",
            "description": "Social message (SHOULD NOT BE PRIORITY)"
        },
        {
            "content": "Notes mil gaye kya assignment ke liye? Need urgently",
            "description": "Urgent academic material request (SHOULD BE PRIORITY)"
        },
        {
            "content": "Unit test exam tomorrow at 2pm in room 101. Syllabus includes chapters 1-5",
            "description": "Detailed exam notification (SHOULD BE PRIORITY)"
        }
    ]

    print("Testing Enhanced ML Analyzer for Indian Student Messages")
    print("=" * 70)

    for i, test in enumerate(test_messages, 1):
        content = test["content"]
        description = test["description"]

        # Analyze the message
        result = analyzer.analyze_message(content, datetime.now())

        print(f"\n{i}. {description}")
        print(f"   Message: \"{content}\"")
        print(f"   Priority: {result['priority_level']} | Score: {result['urgency_score']:.2f}")
        print(f"   Category: {result.get('message_category', 'N/A')}")
        print(f"   Is Priority: {'YES' if result['is_priority'] else 'NO'}")

        if result['deadline_extracted']:
            deadline = result['deadline_extracted']
            print(f"   Deadline: {deadline.strftime('%Y-%m-%d %H:%M')}")

        keywords = eval(result['extracted_keywords']) if result['extracted_keywords'] else []
        if keywords:
            print(f"   Keywords: {', '.join(keywords[:5])}")  # Show first 5 keywords

    print("\n" + "=" * 70)
    print("Testing completed!")

def test_deadline_extraction():
    """Test deadline extraction with various formats."""

    analyzer = MLMessageAnalyzer()

    deadline_tests = [
        "Submit tomorrow 5 baje tak",
        "Due hai aaj raat tak",
        "Deadline hai 2 din mein",
        "Kal subah submit karna hai",
        "Next Monday ko exam hai",
        "Parso viva hai",
        "15/12 tak submit kar do"
    ]

    print("\nTesting Deadline Extraction")
    print("=" * 50)

    for i, content in enumerate(deadline_tests, 1):
        result = analyzer.analyze_message(content, datetime.now())
        deadline = result['deadline_extracted']

        print(f"{i}. \"{content}\"")
        if deadline:
            print(f"   Extracted: {deadline.strftime('%Y-%m-%d %H:%M')}")
        else:
            print("   No deadline extracted")

if __name__ == "__main__":
    test_indian_student_messages()
    test_deadline_extraction()