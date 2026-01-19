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
        """Extract deadline using advanced pattern matching - NO AI needed!"""
        content_lower = content.lower()
        
        # Set timezone to IST
        try:
            ist = ZoneInfo('Asia/Kolkata')
            now = created_at.replace(tzinfo=ist) if created_at.tzinfo is None else created_at.astimezone(ist)
        except:
            # Fallback if ZoneInfo fails
            now = created_at
        
        # Pattern 1: Relative days
        if 'today' in content_lower or 'tonight' in content_lower:
            return self._extract_time_or_default(content, now, end_of_day=True)
        
        if 'tomorrow' in content_lower:
            tomorrow = now + timedelta(days=1)
            return self._extract_time_or_default(content, tomorrow, end_of_day=True)
        
        if 'day after tomorrow' in content_lower or 'day after' in content_lower:
            return now + timedelta(days=2)
        
        if 'next week' in content_lower:
            return now + timedelta(days=7)
        
        # Pattern 2: Days of week (Monday, Tuesday, etc.)
        days_map = {
            'monday': 0, 'mon': 0,
            'tuesday': 1, 'tue': 1,
            'wednesday': 2, 'wed': 2,
            'thursday': 3, 'thu': 3,
            'friday': 4, 'fri': 4,
            'saturday': 5, 'sat': 5,
            'sunday': 6, 'sun': 6
        }
        
        for day_name, day_num in days_map.items():
            if day_name in content_lower:
                current_day = now.weekday()
                days_ahead = (day_num - current_day) % 7
                if days_ahead == 0:
                    days_ahead = 7  # Assume next week
                target_date = now + timedelta(days=days_ahead)
                return self._extract_time_or_default(content, target_date, end_of_day=True)
        
        # Pattern 3: Specific dates (15th, 21st, etc.)
        date_pattern = r'(\d{1,2})(st|nd|rd|th)'
        date_match = re.search(date_pattern, content_lower)
        
        if date_match:
            day = int(date_match.group(1))
            
            # Check for month
            months_map = {
                'jan': 1, 'january': 1, 'feb': 2, 'february': 2,
                'mar': 3, 'march': 3, 'apr': 4, 'april': 4,
                'may': 5, 'jun': 6, 'june': 6,
                'jul': 7, 'july': 7, 'aug': 8, 'august': 8,
                'sep': 9, 'sept': 9, 'september': 9,
                'oct': 10, 'october': 10, 'nov': 11, 'november': 11,
                'dec': 12, 'december': 12
            }
            
            month = now.month
            for month_name, month_num in months_map.items():
                if month_name in content_lower:
                    month = month_num
                    break
            
            try:
                year = now.year
                if month < now.month or (month == now.month and day < now.day):
                    year += 1
                
                deadline = now.replace(year=year, month=month, day=day)
                return self._extract_time_or_default(content, deadline, end_of_day=True)
            except ValueError:
                pass
        
        return None
    
    def _extract_time_or_default(self, content: str, base_date: datetime, end_of_day: bool = True) -> datetime:
        """Extract time from content or use default"""
        # Look for time patterns: 5pm, 17:00, 9:30am
        time_pattern = r'(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?'
        time_match = re.search(time_pattern, content)
        
        if time_match:
            try:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2)) if time_match.group(2) else 0
                meridiem = time_match.group(3).lower() if time_match.group(3) else None
                
                # Convert to 24-hour
                if meridiem == 'pm' and hour != 12:
                    hour += 12
                elif meridiem == 'am' and hour == 12:
                    hour = 0
                
                return base_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            except ValueError:
                pass
        
        # No time found - default to end of day
        if end_of_day:
            return base_date.replace(hour=23, minute=59, second=0, microsecond=0)
        return base_date


    def get_analytics_data(self, messages: List[Dict]) -> Dict:
        """
        Aggregate analytics from a list of message dicts
        """
        total = len(messages)
        if total == 0:
            return {
                'total_messages': 0,
                'priority_distribution': {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0},
                'urgency_score_avg': 0.0,
                'messages_with_deadlines': 0,
                'top_keywords': []
            }
            
        # Initialize counters
        dist = {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        total_urgency = 0.0
        deadlines_count = 0
        keyword_counts = {}
        
        for msg in messages:
            # Priority
            p = msg.get('priority_level', 'LOW')
            if p not in dist: p = 'LOW'
            dist[p] += 1
            
            # Urgency
            total_urgency += float(msg.get('urgency_score', 0) or 0)
            
            # Deadlines
            if msg.get('deadline_extracted'):
                deadlines_count += 1
                
            # Keywords
            try:
                kws = msg.get('extracted_keywords')
                if isinstance(kws, str):
                    kws_list = json.loads(kws)
                else:
                    kws_list = kws or []
                    
                for kw in kws_list:
                    kw_lower = kw.lower()
                    keyword_counts[kw_lower] = keyword_counts.get(kw_lower, 0) + 1
            except:
                pass
                
        # Calculate Top Keywords
        sorted_kws = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            'total_messages': total,
            'priority_distribution': dist,
            'urgency_score_avg': round(total_urgency / total, 2),
            'messages_with_deadlines': deadlines_count,
            'top_keywords': sorted_kws
        }

# Global analyzer instance
analyzer = MLMessageAnalyzer()
