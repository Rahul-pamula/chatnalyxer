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
        Advanced ML Analyzer with 4-Layer Decision Logic
        Based on comprehensive student message training data
        """
        
        # ========== LAYER 1: KEYWORD CATEGORIES ==========
        
        # A. CLASS-RELATED
        self.class_keywords = [
            'class', 'lecture', 'session', 'period', 'tutorial',
            'cancelled', 'canceled', 'cancel', 'cancelation',
            'rescheduled', 'reschedule', 'shifted', 'moved',
            'room changed', 'venue changed', 'online', 'offline',
            'faculty on leave', 'sir on leave', 'mam on leave',
            'special class', 'timetable', 'schedule updated'
        ]
        
        # B. EXAM-RELATED
        self.exam_keywords = [
            'exam', 'test', 'quiz', 'viva', 'examination',
            'internal', 'external', 'midterm', 'final exam',
            'practical exam', 'oral exam', 'surprise test',
            'postponed', 'preponed', 'postpone', 'prepone',
            'exam cancelled', 'exam rescheduled',
            'hall ticket', 'admit card', 'marks', 'results',
            'internal marks', 'grade', 'syllabus updated',
            'exam venue', 'exam room', 'exam hall'
        ]
        
        # C. SUBMISSION/DEADLINE
        self.submission_keywords = [
            'deadline', 'submit', 'submission', 'due',
            'assignment', 'homework', 'project', 'lab',
            'report', 'synopsis', 'essay', 'paper',
            'extended', 'extension', 'last date',
            'soft copy', 'hard copy', 'moodle', 'portal',
            'upload', 'download', 'turn in', 'hand in'
        ]
        
        # D. COLLEGE ADMIN
        self.admin_keywords = [
            'holiday', 'leave', 'off', 'working day',
            'event', 'function', 'ceremony', 'program',
            'meeting', 'workshop', 'seminar', 'conference',
            'orientation', 'briefing', 'placement',
            'bus timing', 'transport', 'notice',
            'hod', 'principal', 'dean', 'announcement'
        ]
        
        # E. URGENT ALERTS
        self.urgent_keywords = [
            'now', 'urgent', 'asap', 'immediate', 'emergency',
            'starts at', 'starting', 'join now', 'come now',
            'attendance', 'attendance being taken',
            'quiz link', 'meeting link', 'hurry up',
            'last chance', 'final call', 'today', 'tonight'
        ]
        
        # F. LOCATION INDICATORS (important context)
        self.location_keywords = [
            'room', 'block', 'hall', 'auditorium', 'seminar hall',
            'classroom', 'lab', 'library', 'ground', 'floor',
            'venue', 'campus', 'building'
        ]
        
        # G. ACTION WORDS (commands/instructions)
        self.action_keywords = [
            'bring', 'carry', 'required', 'mandatory', 'compulsory',
            'attend', 'come', 'reach', 'arrive', 'prepare',
            'complete', 'finish', 'check', 'download', 'upload'
        ]
        
        # ========== LAYER 2: NEGATIVE FILTER (Casual Chatter) ==========
        
        self.casual_chatter_patterns = [
            # Informal address
            'bro', 'dude', 'guys', 'yaar', 'man',
            # Asking patterns
            'anyone', 'someone', 'anybody', 'who has',
            'can someone send', 'pls send', 'plz send',
            'what\'s', 'whats', 'send me', 'give me',
            # Help/questions
            'pls', 'plz', 'please help', 'help me',
            # Casual responses
            'ok', 'okay', 'k', 'kk', 'thanks', 'thnx',
            'lol', 'haha', 'lmao', 'omg', 'wow',
            # Greetings
            'hi', 'hello', 'hey', 'gm', 'good morning', 'good night',
            # Social
            'happy birthday', 'congrats', 'congratulations',
            'canteen', 'mess', 'food'
        ]
        
        # ========== LAYER 3: QUESTION PATTERNS ==========
        
        self.question_indicators = [
            '?',  # Question mark
            # Question words
            'what', 'when', 'where', 'who', 'why', 'how', 'which',
            # Uncertainty
            'do i', 'do we', 'should i', 'should we',
            'can i', 'can we', 'will there', 'is there', 'are there',
            'does anyone', 'do you know', 'anyone know',
            # Doubt expressions
            'confused', 'doubt', 'not sure', 'clarify', 'confirm',
            'is it', 'will it', 'are we'
        ]
        
        # ========== LAYER 4: SHORT URGENT PATTERNS ==========
        
        self.short_urgent_patterns = [
            r'^(class|attendance|meeting|quiz).{0,20}(now|mins?|minutes?).*$',
            r'^join.{0,10}(link|now|meeting).*$',
            r'^(room|venue).{0,10}changed.*$',
            r'^come.{0,15}(lab|class|room|hall).*$'
        ]

    def detect_category(self, content: str) -> str:
        """Detect message category based on keywords"""
        content_lower = content.lower()
        
        # Check each category
        if any(kw in content_lower for kw in self.class_keywords):
            return 'class_related'
        elif any(kw in content_lower for kw in self.exam_keywords):
            return 'exam_related'
        elif any(kw in content_lower for kw in self.submission_keywords):
            return 'submission_deadline'
        elif any(kw in content_lower for kw in self.admin_keywords):
            return 'college_admin'
        elif any(kw in content_lower for kw in self.urgent_keywords):
            return 'urgent_alert'
        else:
            return 'general'
    
    def is_short_urgent(self, content: str) -> bool:
        """Layer 4: Detect short urgent messages"""
        if len(content) > 100:
            return False
            
        for pattern in self.short_urgent_patterns:
            if re.match(pattern, content.lower(), re.IGNORECASE):
                return True
        return False
    
    def has_casual_chatter(self, content: str) -> bool:
        """Layer 2: Check for casual chatter patterns"""
        content_lower = content.lower()
        return any(pattern in content_lower for pattern in self.casual_chatter_patterns)
    
    def is_question(self, content: str) -> bool:
        """Layer 3: Check if message is a question"""
        content_lower = content.lower()
        return any(indicator in content_lower for indicator in self.question_indicators)
    
    def has_important_keywords(self, content: str) -> bool:
        """Layer 1: Check for any important keywords"""
        content_lower = content.lower()
        
        all_important = (
            self.class_keywords + self.exam_keywords + 
            self.submission_keywords + self.admin_keywords + 
            self.urgent_keywords + self.location_keywords + 
            self.action_keywords
        )
        
        return any(kw in content_lower for kw in all_important)
    
    def is_casual_message(self, content: str) -> bool:
        """
        4-LAYER DECISION LOGIC
        
        Layer 1: Keyword Match
        Layer 2: Exclude Questions  
        Layer 3: Short Urgent Messages
        Layer 4: Negative Filter (Casual Chatter)
        
        Returns True if message should be SKIPPED
        """
        content_lower = content.lower().strip()
        
        # Too short (< 10 chars) → skip
        if len(content_lower) < 10:
            return True
        
        # Only emojis/punctuation → skip
        if re.match(r'^[\W\s]+$', content):
            return True
        
        # ⚡ LAYER 4: Short Urgent → ALWAYS SAVE
        if self.is_short_urgent(content):
            return False  # Don't skip, it's important!
        
        # 🚫 LAYER 2: Casual Chatter → SKIP (even with keywords)
        if self.has_casual_chatter(content):
            return True
        
        # ❓ LAYER 3: Question → SKIP (even with keywords)
        if self.is_question(content):
            return True
        
        # 🔍 LAYER 1: Has Important Keywords?
        if self.has_important_keywords(content):
            return False  # Don't skip, it's important!
        
        # No important keywords → skip
        return True
    
    def analyze_message(self, content: str, created_at: datetime) -> Dict:
        """
        Analyze message and return priority, category, etc.
        """
        try:
            category = self.detect_category(content)
            keywords = self._extract_keywords_from_content(content)
            deadline = self._extract_deadline(content, created_at)
            
            # Determine priority based on category
            if category in ['urgent_alert', 'exam_related']:
                priority = 'HIGH'
                urgency = 0.9
                is_priority = 1
            elif category in ['submission_deadline', 'class_related']:
                priority = 'MEDIUM'
                urgency = 0.6
                is_priority = 1
            else:
                priority = 'LOW'
                urgency = 0.3
                is_priority = 0
            
            return {
                'priority_level': priority,
                'urgency_score': urgency,
                'deadline_extracted': deadline,
                'extracted_keywords': json.dumps(keywords),
                'is_priority': is_priority,
                'message_category': category,
                'academic_context': json.dumps({'category': category}),
                'analysis_method': 'keyword_4layer'
            }
        except Exception as e:
            logger.error(f"Message analysis failed: {e}")
            return {
                'priority_level': 'LOW',
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
            self.class_keywords, self.exam_keywords,
            self.submission_keywords, self.admin_keywords,
            self.urgent_keywords
        ]
        
        for keyword_list in all_keyword_lists:
            for keyword in keyword_list:
                if keyword in content_lower:
                    keywords.append(keyword)
        
        return list(set(keywords))[:10]  # Max 10 keywords
    
    def _extract_deadline(self, content: str, created_at: datetime) -> Optional[datetime]:
        """Extract deadline from content"""
        content_lower = content.lower()
        
        # Simple patterns
        if 'today' in content_lower or 'tonight' in content_lower:
            return created_at
        elif 'tomorrow' in content_lower:
            return created_at + timedelta(days=1)
        elif 'next week' in content_lower:
            return created_at + timedelta(days=7)
        
        return None


# Global analyzer instance
analyzer = MLMessageAnalyzer()
