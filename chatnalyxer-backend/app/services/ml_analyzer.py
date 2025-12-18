import re
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dateutil import parser
from zoneinfo import ZoneInfo
import logging
# Gemini API removed - using keyword-based filtering only
from ..config import settings

logger = logging.getLogger(__name__)


class MLMessageAnalyzer:
    def __init__(self):
        """
        Simplified Binary ML Analyzer for Student Messages
        Binary classification: PRIORITY or NOT_PRIORITY
        """
        
        # ========== BINARY CLASSIFICATION KEYWORDS ==========
        
        # MUST-KNOW KEYWORDS (+2.0 each) - Auto priority
        # These are critical events students MUST be aware of
        self.must_know_keywords = [
            # Exams and tests
            'exam', 'test', 'quiz', 'examination', 'viva',
            # Deadlines and submissions
            'deadline', 'submit', 'submission', 'due date', 'last date',
            # Schedule changes (critical)
            'cancelled', 'canceled', 'cancel', 'postponed', 'preponed',
            'rescheduled', 'reschedule', 'shifted', 'moved',
            # Results
            'marks', 'results', 'grade', 'hall ticket', 'admit card'
        ]
        
        # IMPORTANT KEYWORDS (+1.0 each)
        # Significant academic activities
        self.important_keywords = [
            # Classes and sessions
            'class', 'lecture', 'session', 'period', 'tutorial',
            # Assignments and work
            'assignment', 'homework', 'project', 'report', 'presentation',
            # Meetings and events
            'meeting', 'workshop', 'seminar', 'conference', 'orientation',
            # Attendance
            'attendance', 'attend', 'present', 'mandatory', 'compulsory',
            # Locations (when mentioned with events)
            'room', 'hall', 'auditorium', 'lab', 'venue',
            # Important events
            'placement', 'interview', 'briefing'
        ]
        
        # URGENCY BOOST (+0.5 each)
        # Time-sensitive indicators
        self.urgency_keywords = [
            'today', 'tonight', 'tomorrow',
            'now', 'urgent', 'asap', 'immediate',
            'starts at', 'starting', 'join now'
        ]
        
        # CASUAL PENALTY (-2.0 each) - Prevents false positives
        # Clear indicators of non-priority casual messages
        self.casual_keywords = [
            # Informal language
            'lol', 'haha', 'lmao', 'omg', 'bro', 'dude', 'yaar',
            # Greetings
            'good morning', 'good night', 'happy birthday',
            # Social/casual
            'canteen', 'mess', 'lunch', 'dinner',
            # Request patterns (usually casual questions)
            'pls send', 'plz send', 'send me', 'anyone have'
        ]
        
        # QUESTION PENALTY (-0.3)
        # Slight penalty for questions, but won't override important keywords
        self.question_indicators = [
            '?',  # Question mark
            'what', 'when', 'where', 'who', 'why', 'how',
            'do i', 'do we', 'should i', 'can i',
            'anyone know', 'does anyone'
        ]

    def calculate_message_score(self, content: str) -> Tuple[float, Dict]:
        """
        Calculate binary classification score for a message
        
        Returns:
            score (float): The calculated score (threshold: >= 1.0 = PRIORITY)
            details (dict): Breakdown of scoring for debugging
        """
        content_lower = content.lower().strip()
        score = 0.0
        details = {
            'must_know': [],
            'important': [],
            'urgency': [],
            'casual_penalty': [],
            'question_penalty': 0
        }
        
        # MUST-KNOW KEYWORDS (+2.0 each) - Auto priority
        for keyword in self.must_know_keywords:
            if keyword in content_lower:
                score += 2.0
                details['must_know'].append(keyword)
        
        # IMPORTANT KEYWORDS (+1.0 each)
        for keyword in self.important_keywords:
            if keyword in content_lower:
                score += 1.0
                details['important'].append(keyword)
        
        # URGENCY BOOST (+0.5 each)
        for keyword in self.urgency_keywords:
            if keyword in content_lower:
                score += 0.5
                details['urgency'].append(keyword)
        
        # CASUAL PENALTY (-2.0 each)
        for pattern in self.casual_keywords:
            if pattern in content_lower:
                score -= 2.0
                details['casual_penalty'].append(pattern)
        
        # QUESTION PENALTY (-0.3, applied once)
        for indicator in self.question_indicators:
            if indicator in content_lower:
                score -= 0.3
                details['question_penalty'] = -0.3
                break  # Only apply once
        
        return score, details
    
    def is_casual_message(self, content: str) -> bool:
        """
        Multi-layer filtering approach for robust message classification
        
        Layer 1: Protected keywords - Never filter important student messages
        Layer 2: Adaptive scoring - Use ML scoring for other messages
        
        Returns True if message should be SKIPPED
        """
        content_lower = content.lower().strip()
        
        # Too short (< 10 chars) → skip
        if len(content_lower) < 10:
            return True
        
        # Only emojis/punctuation → skip
        if re.match(r'^[\W\s]+$', content):
            return True
        
        # Layer 1: PROTECTED KEYWORDS - Never filter these
        # These are guaranteed important for students
        protected_keywords = [
            # Submission related
            'submit', 'submission', 'assignment', 'homework', 'project',
            'report', 'essay', 'paper', 'presentation', 'synopsis',
            # Deadline related
            'deadline', 'due', 'due date', 'last date',
            # Exam related
            'exam', 'test', 'quiz', 'viva', 'examination',
            'marks', 'results', 'grade', 'hall ticket', 'admit card',
            # Attendance related
            'attend', 'attendance', 'present', 'absent',
            # Class/Meeting related
            'meeting', 'lecture', 'class', 'session', 'seminar',
            'workshop', 'conference', 'orientation', 'briefing',
            # Schedule changes
            'cancelled', 'canceled', 'postponed', 'preponed',
            'rescheduled', 'shifted', 'moved',
            # Important events
            'placement', 'interview', 'internship'
        ]
        
        # If message contains ANY protected keyword, NEVER filter it
        if any(keyword in content_lower for keyword in protected_keywords):
            logger.debug(f"Protected keyword found - saving message: {content[:50]}")
            return False  # Don't skip - always save
        
        # Layer 2: Adaptive scoring for other messages
        # Calculate score using existing weighted system
        score, details = self.calculate_message_score(content)
        
        # Log for debugging
        logger.debug(f"Message score: {score:.2f} | Details: {details}")
        
        # Lower threshold to 0.0 for better capture
        # Only messages with truly negative scores are filtered
        # This allows more flexibility for real-world messages
        return score < 0.0
    
    def analyze_message(self, content: str, created_at: datetime) -> Dict:
        """
        Analyze message and return binary priority classification
        Uses simplified binary scoring: PRIORITY or NOT_PRIORITY
        """
        try:
            # Calculate score
            score, score_details = self.calculate_message_score(content)
            
            # Extract keywords and deadline
            keywords = self._extract_keywords_from_content(content)
            deadline = self._extract_deadline(content, created_at)
            
            # BINARY CLASSIFICATION - Single threshold at 1.0
            if score >= 1.0:
                priority = 'PRIORITY'
                urgency = min(1.0, score / 2.0)  # Scale to 0-1.0 based on score
                is_priority = 1
            else:
                priority = 'NOT_PRIORITY'
                urgency = 0.0
                is_priority = 0
            
            # Determine category for context
            category = 'general'
            if any(kw in content.lower() for kw in ['exam', 'test', 'quiz']):
                category = 'exam_related'
            elif any(kw in content.lower() for kw in ['deadline', 'submit', 'assignment']):
                category = 'submission_deadline'
            elif any(kw in content.lower() for kw in ['class', 'cancelled', 'rescheduled']):
                category = 'class_related'
            
            return {
                'priority_level': priority,
                'urgency_score': urgency,
                'deadline_extracted': deadline,
                'extracted_keywords': json.dumps(keywords),
                'is_priority': is_priority,
                'message_category': category,
                'academic_context': json.dumps({
                    'category': category,
                    'score': round(score, 2),
                    'score_details': score_details
                }),
                'analysis_method': 'binary_classification_v1'
            }
        except Exception as e:
            logger.error(f"Message analysis failed: {e}")
            return {
                'priority_level': 'NOT_PRIORITY',
                'urgency_score': 0.0,
                'deadline_extracted': None,
                'extracted_keywords': '[]',
                'is_priority': 0,
                'message_category': 'general',
                'academic_context': '{}',
                'analysis_method': 'fallback'
            }
    
    def _extract_keywords_from_content(self, content: str) -> List[str]:
        """Extract relevant keywords from content"""
        content_lower = content.lower()
        keywords = []
        
        all_keyword_lists = [
            self.must_know_keywords,
            self.important_keywords,
            self.urgency_keywords
        ]
        
        for keyword_list in all_keyword_lists:
            for keyword in keyword_list:
                if keyword in content_lower:
                    keywords.append(keyword)
        
        return list(set(keywords))[:10]  # Max 10 keywords
    
    def _extract_deadline(self, content: str, created_at: datetime) -> Optional[datetime]:
        """Simplified deadline extraction without time support"""
        content_lower = content.lower().strip()
        
        # Ensure created_at has timezone info (IST)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=ZoneInfo("Asia/Kolkata"))
        
        # Pattern 1: "today" or "tonight"
        if 'today' in content_lower or 'tonight' in content_lower:
            return created_at.replace(hour=23, minute=59, second=0, microsecond=0)
        
        # Pattern 2: "tomorrow"
        if 'tomorrow' in content_lower:
            return (created_at + timedelta(days=1)).replace(hour=23, minute=59, second=0, microsecond=0)
        
        # Pattern 3: Specific date (DD-MM-YYYY, DD/MM/YYYY)
        date_match = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', content_lower)
        if date_match:
            try:
                day, month, year = int(date_match.group(1)), int(date_match.group(2)), int(date_match.group(3))
                return datetime(year, month, day, 23, 59, 0, tzinfo=ZoneInfo("Asia/Kolkata"))
            except:
                pass
        
        # Pattern 4: "next week"
        if 'next week' in content_lower:
            return created_at + timedelta(days=7)
        
        return None


# Global analyzer instance
analyzer = MLMessageAnalyzer()
