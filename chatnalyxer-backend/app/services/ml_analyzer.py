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
        Advanced ML Analyzer with Weighted Scoring System
        Handles ambiguities better than binary filtering
        """
        
        # ========== WEIGHTED SCORING CATEGORIES ==========
        
        # HIGH-VALUE KEYWORDS (+1.5 each)
        # Core action items and high-stakes events
        self.high_value_keywords = [
            'exam', 'test', 'quiz', 'examination', 'viva',
            'deadline', 'submit', 'submission', 'due date', 'last date',
            'cancelled', 'canceled', 'cancel', 'postponed', 'preponed',
            'rescheduled', 'reschedule', 'shifted', 'moved',
            'marks', 'results', 'grade', 'hall ticket', 'admit card'
        ]
        
        # URGENCY KEYWORDS (+1.0 each)
        # Time-sensitive indicators
        self.urgency_keywords = [
            'now', 'urgent', 'asap', 'immediate', 'emergency',
            'today', 'tonight', 'tomorrow',
            'starts at', 'starting', 'join now', 'come now',
            'last chance', 'final call', 'hurry up',
            'attendance', 'attendance being taken'
        ]
        
        # ACTION KEYWORDS (+0.5 each)
        # Direct instructions and commands
        self.action_keywords = [
            'bring', 'carry', 'required', 'mandatory', 'compulsory',
            'attend', 'come', 'reach', 'arrive', 'prepare',
            'complete', 'finish', 'check', 'download', 'upload',
            'turn in', 'hand in'
        ]
        
        # CONTEXT KEYWORDS (+0.5 each) - INCREASED from +0.3
        # Academic/administrative context
        self.context_keywords = [
            # Class-related
            'class', 'lecture', 'session', 'period', 'tutorial',
            'online', 'offline', 'special class', 'timetable',
            # Locations
            'room', 'block', 'hall', 'auditorium', 'seminar hall',
            'classroom', 'lab', 'library', 'ground', 'floor',
            'venue', 'campus', 'building', 'meeting room',
            # Events
            'meeting', 'workshop', 'seminar', 'conference',
            'event', 'function', 'ceremony', 'program',
            'orientation', 'briefing', 'placement',
            # Assignments
            'assignment', 'homework', 'project', 'report',
            'synopsis', 'essay', 'paper', 'presentation',
            # Admin
            'holiday', 'leave', 'off', 'working day',
            'notice', 'announcement', 'hod', 'principal', 'dean',
            'faculty', 'sir', 'mam', 'professor'
        ]
        
        # CASUAL CHATTER PENALTIES (-1.0 each)
        # Reduces importance score
        self.casual_chatter_patterns = [
            # Informal address
            'bro', 'dude', 'guys', 'yaar', 'man', 'buddy',
            # Casual language
            'lol', 'haha', 'lmao', 'omg', 'wow', 'cool',
            # Requests
            'pls send', 'plz send', 'send me', 'give me',
            'can someone send', 'anyone have',
            # Greetings
            'hi', 'hello', 'hey', 'gm', 'good morning', 'good night',
            # Social
            'happy birthday', 'congrats', 'congratulations',
            'canteen', 'mess', 'food', 'lunch', 'dinner',
            # Casual responses
            'ok', 'okay', 'kk', 'thnx', 'thx', 'thanks man'
        ]
        
        # QUESTION INDICATORS (-0.5 penalty)
        # Questions get slight penalty but don't override important keywords
        self.question_indicators = [
            '?',  # Question mark
            # Question words (only count at start of message)
            'what', 'when', 'where', 'who', 'why', 'how', 'which',
            # Uncertainty phrases
            'do i', 'do we', 'should i', 'should we',
            'can i', 'can we', 'will there', 'is there', 'are there',
            'does anyone', 'do you know', 'anyone know',
            'confused', 'doubt', 'not sure', 'is it', 'will it'
        ]
        
        # ========== CRITICAL OVERRIDE RULES ==========
        # These combinations are SO important they override everything
        self.critical_overrides = {
            # Exam/Test overrides
            ('deadline', 'extension'): 5.0,
            ('deadline', 'extended'): 5.0,
            ('exam', 'cancelled'): 5.0,
            ('exam', 'canceled'): 5.0,
            ('exam', 'postponed'): 5.0,
            ('exam', 'preponed'): 5.0,
            ('class', 'cancelled'): 5.0,
            ('class', 'canceled'): 5.0,
            ('test', 'cancelled'): 5.0,
            ('test', 'postponed'): 5.0,
            # Urgent combinations
            ('urgent', 'exam'): 3.0,
            ('urgent', 'deadline'): 3.0,
            ('urgent', 'class'): 3.0,
            ('urgent', 'meeting'): 3.0,
            # Meeting/Event combinations
            ('meeting', 'auditorium'): 2.5,
            ('meeting', 'mandatory'): 2.5,
            ('attendance', 'mandatory'): 2.5,
            # NEW: Deadline/homework combinations
            ('homework', 'due'): 2.5,
            ('homework', 'tomorrow'): 2.5,
            ('assignment', 'due'): 2.5,
            # NEW: Event combinations
            ('workshop', 'tomorrow'): 2.5,
            ('workshop', 'mandatory'): 2.5,
            ('seminar', 'tomorrow'): 2.5,
            ('seminar', 'mandatory'): 2.5,
            ('placement', 'mandatory'): 3.0,
            ('briefing', 'mandatory'): 2.5,
        }
        
        # SHORT URGENT PATTERNS (auto high-score)
        self.short_urgent_patterns = [
            r'^(class|attendance|meeting|quiz).{0,20}(now|mins?|minutes?).*$',
            r'^join.{0,10}(link|now|meeting).*$',
            r'^(room|venue).{0,10}changed.*$',
            r'^come.{0,15}(lab|class|room|hall|auditorium).*$',
            r'^(meeting|exam|class).{0,15}(auditorium|hall|room).*$'
        ]

    def calculate_message_score(self, content: str) -> Tuple[float, Dict]:
        """
        Calculate weighted score for a message
        
        Returns:
            score (float): The calculated score
            details (dict): Breakdown of scoring for debugging
        """
        content_lower = content.lower().strip()
        score = 0.0
        details = {
            'high_value': [],
            'urgency': [],
            'action': [],
            'context': [],
            'casual_penalty': [],
            'question_penalty': 0,
            'override': None
        }
        
        # Check for critical overrides first
        for (word1, word2), override_score in self.critical_overrides.items():
            if word1 in content_lower and word2 in content_lower:
                details['override'] = f"{word1}+{word2}"
                return override_score, details
        
        # Check short urgent patterns (auto high score)
        for pattern in self.short_urgent_patterns:
            if re.match(pattern, content_lower, re.IGNORECASE):
                details['override'] = 'short_urgent_pattern'
                return 3.0, details
        
        # HIGH-VALUE KEYWORDS (+1.5 each)
        for keyword in self.high_value_keywords:
            if keyword in content_lower:
                score += 1.5
                details['high_value'].append(keyword)
        
        # URGENCY KEYWORDS (+1.0 each)
        for keyword in self.urgency_keywords:
            if keyword in content_lower:
                score += 1.0
                details['urgency'].append(keyword)
        
        # ACTION KEYWORDS (+0.5 each)
        for keyword in self.action_keywords:
            if keyword in content_lower:
                score += 0.5
                details['action'].append(keyword)
        
        # CONTEXT KEYWORDS (+0.5 each, max 3 to prevent spam) - INCREASED from +0.3
        context_count = 0
        for keyword in self.context_keywords:
            if keyword in content_lower and context_count < 3:
                score += 0.5
                details['context'].append(keyword)
                context_count += 1
        
        # CASUAL CHATTER PENALTY (-1.0 each)
        for pattern in self.casual_chatter_patterns:
            if pattern in content_lower:
                score -= 1.0
                details['casual_penalty'].append(pattern)
        
        # QUESTION PENALTY (-0.5)
        for indicator in self.question_indicators:
            if indicator in content_lower:
                score -= 0.5
                details['question_penalty'] = -0.5
                break  # Only apply once
        
        return score, details
    
    def detect_category(self, content: str) -> str:
        """Detect message category based on keywords"""
        content_lower = content.lower()
        
        # Check based on high-value and context keywords
        if any(kw in content_lower for kw in ['exam', 'test', 'quiz', 'viva', 'marks', 'results']):
            return 'exam_related'
        elif any(kw in content_lower for kw in ['deadline', 'submit', 'assignment', 'project']):
            return 'submission_deadline'
        elif any(kw in content_lower for kw in ['class', 'lecture', 'cancelled', 'rescheduled']):
            return 'class_related'
        elif any(kw in content_lower for kw in ['meeting', 'workshop', 'seminar', 'event']):
            return 'college_admin'
        elif any(kw in content_lower for kw in ['now', 'urgent', 'asap', 'immediate']):
            return 'urgent_alert'
        else:
            return 'general'
    
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
        Analyze message and return priority, category, etc.
        Uses weighted scoring system for priority assignment
        """
        try:
            # Calculate score
            score, score_details = self.calculate_message_score(content)
            
            # Detect category
            category = self.detect_category(content)
            
            # Extract keywords and deadline
            keywords = self._extract_keywords_from_content(content)
            deadline = self._extract_deadline(content, created_at)
            
            # Determine priority based on SCORE THRESHOLDS (ADJUSTED for better accuracy)
            if score >= 1.8:  # Lowered from 2.0
                priority = 'HIGH'
                urgency = min(0.9, score / 5.0)  # Scale to 0-0.9
                is_priority = 1
            elif score >= 0.9:  # Lowered from 1.0
                priority = 'MEDIUM'
                urgency = min(0.7, score / 3.0)  # Scale to 0-0.7
                is_priority = 0
            elif score >= 0.4:  # Lowered from 0.5
                priority = 'LOW'
                urgency = min(0.5, score / 2.0)  # Scale to 0-0.5
                is_priority = 0
            else:
                # This shouldn't happen for saved messages, but handle it
                priority = 'LOW'
                urgency = 0.1
                is_priority = 0
            
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
                'analysis_method': 'weighted_scoring_v1'
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
            self.high_value_keywords,
            self.urgency_keywords,
            self.action_keywords,
            self.context_keywords
        ]
        
        for keyword_list in all_keyword_lists:
            for keyword in keyword_list:
                if keyword in content_lower:
                    keywords.append(keyword)
        
        return list(set(keywords))[:10]  # Max 10 keywords
    
    def _extract_deadline(self, content: str, created_at: datetime) -> Optional[datetime]:
        """Enhanced deadline extraction with time support"""
        content_lower = content.lower().strip()
        
        # Ensure created_at has timezone info (IST)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=ZoneInfo("Asia/Kolkata"))
        
        # Extract time first (if present)
        time_info = self._extract_time(content_lower)
        
        # Pattern 1: "today" + optional time
        if 'today' in content_lower or 'tonight' in content_lower:
            deadline = created_at.replace(hour=0, minute=0, second=0, microsecond=0)
            if time_info:
                deadline = deadline.replace(hour=time_info['hour'], minute=time_info['minute'])
            return deadline
        
        # Pattern 2: "tomorrow" + optional time
        if 'tomorrow' in content_lower:
            deadline = (created_at + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            if time_info:
                deadline = deadline.replace(hour=time_info['hour'], minute=time_info['minute'])
            return deadline
        
        # Pattern 3: Specific date (DD-MM-YYYY, DD/MM/YYYY)
        date_match = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', content_lower)
        if date_match:
            try:
                day, month, year = int(date_match.group(1)), int(date_match.group(2)), int(date_match.group(3))
                deadline = datetime(year, month, day, tzinfo=ZoneInfo("Asia/Kolkata"))
                if time_info:
                    deadline = deadline.replace(hour=time_info['hour'], minute=time_info['minute'])
                return deadline
            except:
                pass
        
        # Pattern 4: "next week"
        if 'next week' in content_lower:
            return created_at + timedelta(days=7)
        
        return None
    
    def _extract_time(self, content: str) -> Optional[dict]:
        """Extract time from content (e.g., '5pm', '3:30 PM', 'by 2 PM')"""
        time_patterns = [
            r'(\d{1,2}):(\d{2})\s*(am|pm)',  # 3:30 PM, 5:30pm
            r'(\d{1,2})\s*(am|pm)',           # 5pm, 5 pm
            r'at\s+(\d{1,2}):(\d{2})',       # at 10:00
            r'by\s+(\d{1,2})\s*(am|pm)',     # by 5pm
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, content.lower())
            if match:
                groups = match.groups()
                hour = int(groups[0])
                minute = 0
                meridiem = None
                
                # Determine minute and meridiem based on pattern
                if len(groups) >= 2 and groups[1] and groups[1].isdigit():
                    minute = int(groups[1])
                    meridiem = groups[2] if len(groups) > 2 else None
                elif len(groups) >= 2 and groups[1] in ['am', 'pm']:
                    meridiem = groups[1]
                
                # Convert to 24-hour format
                if meridiem == 'pm' and hour < 12:
                    hour += 12
                elif meridiem == 'am' and hour == 12:
                    hour = 0
                
                return {'hour': hour, 'minute': minute}
        
        return None


# Global analyzer instance
analyzer = MLMessageAnalyzer()
