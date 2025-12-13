"""
Simple test to identify which tests are failing
"""

import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.services.ml_analyzer import analyzer

# Test messages
tests = [
    ("bro do we have class tomorrow?", "SKIP", None),
    ("bring your books to class", "SAVE", "MEDIUM"),
    ("do we have class today?", "SKIP", None),
    ("seminar hall changed to room 205", "SAVE", "MEDIUM"),
]

print("ANALYZING SPECIFIC TESTS:")
print("="*80)

for message, expected_action, expected_priority in tests:
    is_casual = analyzer.is_casual_message(message)
    score, details = analyzer.calculate_message_score(message)
    analysis = analyzer.analyze_message(message, datetime.now())
    
    action = "SKIP" if is_casual else "SAVE"
    priority = analysis['priority_level']
    
    status = "PASS" if (action == expected_action and (expected_priority is None or priority == expected_priority)) else "FAIL"
    
    print(f"\n[{status}] {message}")
    print(f"    Expected: {expected_action} {expected_priority or ''}")
    print(f"    Got: {action} ({priority})")
    print(f"    Score: {score:.2f}")
    print(f"    High-value: {details.get('high_value', [])}")
    print(f"    Urgency: {details.get('urgency', [])}")
    print(f"    Context: {details.get('context', [])}")
    print(f"    Casual: {details.get('casual_penalty', [])}")
    print(f"    Question: {details.get('question_penalty', 0)}")
    print(f"    Override: {details.get('override')}")
