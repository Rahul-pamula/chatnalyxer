"""
Test script for the weighted scoring system
Tests edge cases and verifies scoring logic
"""

import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ml_analyzer import analyzer

def test_message(message: str, expected_action: str, expected_priority: str = None):
    """Test a single message"""
    print(f"\n{'='*80}")
    print(f"Testing: {message}")
    print(f"Expected: {expected_action}", end="")
    if expected_priority:
        print(f" ({expected_priority})", end="")
    print()
    
    # Check if casual
    is_casual = analyzer.is_casual_message(message)
    
    # Calculate score
    score, details = analyzer.calculate_message_score(message)
    
    # Analyze message
    analysis = analyzer.analyze_message(message, datetime.now())
    
    # Results
    action = "SKIP" if is_casual else "SAVE"
    priority = analysis['priority_level']
    
    print(f"Result: {action} ({priority})")
    print(f"Score: {score:.2f}")
    print(f"Details: high_value={len(details.get('high_value', []))}, urgency={len(details.get('urgency', []))}, casual_penalty={len(details.get('casual_penalty', []))}")
    
    # Verify
    if action == expected_action:
        if expected_priority is None or priority == expected_priority:
            print("[PASS]")
            return True
        else:
            print(f"[FAIL] - Wrong priority: expected {expected_priority}, got {priority}")
            return False
    else:
        print(f"[FAIL] - Wrong action: expected {expected_action}, got {action}")
        return False

def main():
    print("="*80)
    print("WEIGHTED SCORING SYSTEM - TEST SUITE")
    print("="*80)
    
    tests_passed = 0
    tests_total = 0
    
    # ========== TEST CATEGORY 1: SHOULD SKIP ==========
    print("\n\n### TEST CATEGORY 1: SHOULD SKIP (score < 0.5) ###")
    
    test_cases_skip = [
        ("bro do we have class tomorrow?", "SKIP"),  # casual + question + class = -1.0 -0.5 +0.3 = -1.2
        ("lol send me notes", "SKIP"),  # casual pattern
        ("anyone have the assignment?", "SKIP"),  # too casual
        ("hi guys good morning", "SKIP"),  # greetings only
        ("thanks man appreciate it", "SKIP"),  # casual response
    ]
    
    for message, expected in test_cases_skip:
        tests_total += 1
        if test_message(message, expected):
            tests_passed += 1
    
    # ========== TEST CATEGORY 2: SHOULD SAVE - HIGH PRIORITY ==========
    print("\n\n### TEST CATEGORY 2: SHOULD SAVE - HIGH PRIORITY (score >= 2.0) ###")
    
    test_cases_high = [
        ("exam tomorrow", "SAVE", "HIGH"),  # exam(1.5) + tomorrow(1.0) = 2.5
        ("class cancelled", "SAVE", "HIGH"),  # Override rule = 5.0
        ("submit assignment today", "SAVE", "HIGH"),  # submit(1.5) + today(1.0) = 2.5
        ("deadline extended to next week", "SAVE", "HIGH"),  # Override: deadline+extended = 5.0
        ("urgent meeting in auditorium", "SAVE", "HIGH"),  # Override: urgent+meeting = 3.0
        ("exam postponed", "SAVE", "HIGH"),  # Override: exam+postponed = 5.0
    ]
    
    for message, expected, priority in test_cases_high:
        tests_total += 1
        if test_message(message, expected, priority):
            tests_passed += 1
    
    # ========== TEST CATEGORY 3: SHOULD SAVE - MEDIUM PRIORITY ==========
    print("\n\n### TEST CATEGORY 3: SHOULD SAVE - MEDIUM PRIORITY (score >= 1.0) ###")
    
    test_cases_medium = [
        ("bring your books to class", "SAVE", "MEDIUM"),  # bring(0.5) + class(0.3) + books(0) ≈ 0.8 -> might be LOW
        ("meeting tomorrow in room 301", "SAVE", "MEDIUM"),  # meeting(0.3) + tomorrow(1.0) + room(0.3) = 1.6
        ("workshop starts at 2pm", "SAVE", "MEDIUM"),  # workshop(0.3) + starts at(1.0) = 1.3
    ]
    
    for message, expected, priority in test_cases_medium:
        tests_total += 1
        if test_message(message, expected, priority):
            tests_passed += 1
    
    # ========== TEST CATEGORY 4: EDGE CASES - QUESTIONS WITH CRITICAL KEYWORDS ==========
    print("\n\n### TEST CATEGORY 4: EDGE CASES - QUESTIONS WITH CRITICAL KEYWORDS ###")
    
    test_cases_edge = [
        ("is the exam postponed?", "SAVE", "HIGH"),  # exam(1.5) + postponed(1.5) + question(-0.5) = 2.5 → HIGH ✓
        ("do we have class today?", "SKIP"),  # class(0.3) + today(1.0) + question(-0.5) = 0.8 → might SAVE
        ("when is the deadline?", "SAVE"),  # deadline(1.5) + question(-0.5) = 1.0 → MEDIUM
        ("what time is the exam?", "SAVE"),  # exam(1.5) + question(-0.5) = 1.0 → MEDIUM
    ]
    
    for message, expected, *priority in test_cases_edge:
        tests_total += 1
        if test_message(message, expected, priority[0] if priority else None):
            tests_passed += 1
    
    # ========== TEST CATEGORY 5: NEW KEYWORDS (meeting, auditorium, etc.) ==========
    print("\n\n### TEST CATEGORY 5: NEW KEYWORDS (meeting, auditorium, locations) ###")
    
    test_cases_new = [
        ("meeting in auditorium now", "SAVE", "HIGH"),  # Override: meeting+auditorium=2.5 + now(1.0) = 3.5
        ("seminar hall changed to room 205", "SAVE", "MEDIUM"),  # seminar(0.3) + hall(0.3) + room(0.3) = 0.9
        ("mandatory attendance in auditorium", "SAVE", "HIGH"),  # Override: attendance+mandatory=2.5
        ("presentation tomorrow in conference hall", "SAVE", "MEDIUM"),  # presentation(0.3) + tomorrow(1.0) + conference(0.3) + hall(0.3) = 1.9
    ]
    
    for message, expected, priority in test_cases_new:
        tests_total += 1
        if test_message(message, expected, priority):
            tests_passed += 1
    
    # ========== SUMMARY ==========
    print("\n\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Tests Passed: {tests_passed}/{tests_total}")
    print(f"Success Rate: {tests_passed/tests_total*100:.1f}%")
    
    if tests_passed == tests_total:
        print("\n[SUCCESS] ALL TESTS PASSED!")
    else:
        print(f"\n[WARNING] {tests_total - tests_passed} tests failed")
    
    return tests_passed == tests_total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
