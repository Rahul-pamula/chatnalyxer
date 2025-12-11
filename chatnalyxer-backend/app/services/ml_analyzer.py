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
        # Keyword-based filtering only (no Gemini API)
        
        # High priority keywords - urgent/critical academic
        self.high_priority_keywords = [
            # Urgency
            'urgent', 'asap', 'immediate', 'emergency', 'critical', 'important',
            'last chance', 'final call', 'last day', 'deadline', 'due today', 'due tonight',
            # Exams
            'exam', 'test', 'quiz', 'viva', 'examination', 'midterm', 'final exam',
            'internal exam', 'external exam', 'practical exam', 'oral exam', 'surprise test',
            # Submissions
            'submission', 'submit', 'due', 'turn in', 'hand in',
        ]

        # Medium priority keywords - academic events and activities
        self.medium_priority_keywords = [
            # Classes & Lectures
            'class', 'lecture', 'session', 'period', 'tutorial', 'seminar',
            # Assignments & Projects
            'assignment', 'homework', 'project', 'task', 'work', 'coursework',
            'report', 'essay', 'paper', 'thesis', 'synopsis', 'document',
            # Presentations & Reviews
            'presentation', 'ppt', 'demo', 'demonstration', 'review', 'evaluation',
            # Labs & Practicals
            'lab', 'laboratory', 'practical', 'experiment', 'workshop',
            # Meetings & Events
            'meeting', 'orientation', 'briefing', 'discussion', 'conference',
            'event', 'program', 'ceremony', 'function',
            # Administrative
            'attendance', 'registration', 'enrollment', 'admission', 'form',
            'certificate', 'permission', 'approval', 'verification',
            # Time indicators
            'today', 'tonight', 'tomorrow', 'this week', 'next week',
            'this month', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
            # Locations
            'room', 'block', 'hall', 'auditorium', 'classroom', 'lab', 'library',
            'venue', 'ground', 'campus', 'building', 'floor',
            # Actions
            'attend', 'come', 'reach', 'arrive', 'bring', 'carry', 'prepare',
            'complete', 'finish', 'required', 'mandatory', 'compulsory',
            # Schedule changes
            'reschedule', 'postpone', 'prepone', 'cancel', 'shift', 'change',
            'extended', '延期', 'advanced', 'moved',
            # Materials
            'notes', 'material', 'book', 'pdf', 'file', 'soft copy', 'hard copy',
            'printout', 'xerox', 'copy'
        ]
        
        # Question/Dilemma patterns - SKIP these even with important keywords
        self.question_patterns = [
            # Question words
            '?', 'what', 'when', 'where', 'who', 'why', 'how', 'which',
            # Uncertainty
            'do i', 'do we', 'should i', 'should we', 'can i', 'can we',
            'will there', 'is there', 'are there',
            'do you know', 'does anyone', 'anyone know',
            # Dilemma
            'confused', 'not sure', 'doubt', 'clarify', 'confirm',
            'wondering', 'asking', 'question'
        ]
        
        # Casual keywords - messages to SKIP
        self.casual_keywords = [
            'hi', 'hello', 'hey', 'hlo', 'gm', 'good morning', 'good night', 'gn',
            'ok', 'okay', 'k', 'kk', 'lol', 'haha', 'lmao', 'omg', 'wow',
            'thanks', 'thank you', 'thnx', 'thx', 'welcome', 'congratulations', 'congrats',
            'birthday', 'bday', 'happy', 'nice', 'cool', 'great', 'awesome',
            ':)', ':(', '😀', '😂', '👍', '🎉', '❤️'
        ]

        # Date/time patterns for deadline extraction
        self.date_patterns = [
            r'due\\s+(?:on\\s+)?(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})',
            r'submit\\s+(?:by\\s+)?(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})',
            r'deadline\\s+(?:is\\s+)?(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})',
            r'by\\s+(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})',
            r'until\\s+(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})'
        ]

        self.relative_date_patterns = [
            (r'today', 0),
            (r'tomorrow', 1),
            (r'tonight', 0),
            (r'this\\s+week', 7),
            (r'next\\s+week', 7),
            (r'this\\s+month', 30),
            (r'next\\s+month', 30)
        ]

    def analyze_message(self, content: str, created_at: datetime) -> Dict:
        """
        Analyze message using keyword-based pattern matching ONLY
        No Gemini API - faster and more reliable
        """
        try:
            # Use keyword-based analysis directly (no Gemini)
            return self._fallback_analysis(content, created_at)
        except Exception as e:
            logger.error(f"Message analysis failed: {e}")
            # Return default LOW priority if analysis fails
            return {
                'priority_level': 'LOW',
                'urgency_score': 0.0,
                'deadline_extracted': None,
                'extracted_keywords': [],
                'is_priority': 0,
                'gemini_analysis': None,
                'analysis_method': 'keyword'
            }
    
    
    def is_question_or_dilemma(self, content: str) -> bool:
        """
        Detect if message is a question or expressing uncertainty/dilemma
        Returns True if message should be skipped (even with important keywords)
        
        Examples that should return True:
        - "do I need to come for tomorrow exam?"
        - "Is there a meeting today?"
        - "When is the submission deadline?"
        - "Anyone know if we have class?"
        """
        content_lower = content.lower().strip()
        
        # Check for question patterns
        for pattern in self.question_patterns:
            if pattern in content_lower:
                return True
        
        return False
    
    def is_casual_message(self, content: str) -> bool:
        """
        Detect if message is casual/unimportant and should be skipped
        Returns True if message should NOT be saved to database
        
        Priority order:
        1. Check if it's a question/dilemma (skip even with important keywords)
        2. Check if it's too short
        3. Check if it has only casual keywords
        4. Check if it's only emojis/punctuation
        """
        content_lower = content.lower().strip()
        
        # 🔍 PRIORITY CHECK: Questions/Dilemmas (skip even with academic keywords)
        if self.is_question_or_dilemma(content):
            return True
        
        # Very short messages (less than 10 chars) are likely casual
        if len(content_lower) < 10:
            return True
        
        # Check for casual vs important keywords
        has_casual = any(keyword in content_lower for keyword in self.casual_keywords)
        has_important = any(keyword in content_lower for keyword in 
                          self.high_priority_keywords + self.medium_priority_keywords)
        
        # If has casual keywords and NO important keywords → skip
        if has_casual and not has_important:
            return True
        
        # Messages with ONLY emojis, punctuation, or whitespace
        if re.match(r'^[\W\s]+$', content):
            return True
            
        return False

    
    # _analyze_with_gemini method removed - not using Gemini API anymore
    
    def _extract_keywords(self, content: str) -> List[str]:
        """
        Extract priority-related keywords from message content
        """
        content_lower = content.lower()
        keywords = []

        # Check for high priority keywords
        for keyword in self.high_priority_keywords:
            if keyword in content_lower:
                keywords.append(keyword)

        # Check for medium priority keywords
        for keyword in self.medium_priority_keywords:
            if keyword in content_lower:
                keywords.append(keyword)

        return list(set(keywords))  # Remove duplicates

    def _extract_deadline(self, content: str, created_at: datetime) -> Optional[datetime]:
        """
        Extract deadline information from message content
        """
        content_lower = content.lower()

        # Check relative date patterns
        for pattern, days in self.relative_date_patterns:
            if re.search(pattern, content_lower):
                return created_at + timedelta(days=days)

        # Check absolute date patterns
        for pattern in self.date_patterns:
            match = re.search(pattern, content_lower)
            if match:
                date_str = match.group(1)
                try:
                    # Try different date formats
                    for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y', '%m-%d-%Y']:
                        try:
                            parsed_date = datetime.strptime(date_str, fmt)
                            # Assume current year if not specified
                            if parsed_date.year < 2000:
                                parsed_date = parsed_date.replace(
                                    year=datetime.now().year)
                            return parsed_date
                        except ValueError:
                            continue

                    # Try natural language parsing
                    return parser.parse(date_str, fuzzy=True)

                except Exception as e:
                    logger.warning(f"Could not parse date '{date_str}': {e}")
                    continue

        return None

    def _fallback_analysis(self, content: str, created_at: datetime) -> Dict:
        """
        Fallback analysis using pattern matching when Gemini API fails
        """
        keywords = self._extract_keywords(content)
        deadline = self._extract_deadline(content, created_at)

        # Calculate urgency score based on keywords
        urgency_score = self._calculate_urgency_score(content, keywords)
        priority_level = self._determine_priority_level(
            urgency_score, keywords)

        return {
            'priority_level': priority_level,
            'urgency_score': urgency_score,
            'deadline_extracted': deadline,
            'extracted_keywords': keywords,
            'is_priority': 1 if priority_level == 'HIGH' else 0,
            'gemini_analysis': None,
            'analysis_method': 'fallback'
        }

    def _calculate_urgency_score(self, content: str, keywords: List[str]) -> float:
        """
        Calculate urgency score based on content analysis
        """
        score = 0.0

        # Keyword-based scoring
        high_priority_count = sum(
            1 for k in keywords if k in self.high_priority_keywords)
        medium_priority_count = sum(
            1 for k in keywords if k in self.medium_priority_keywords)

        score += high_priority_count * 0.3
        score += medium_priority_count * 0.15

        # Text formatting indicators
        if content.isupper():
            score += 0.2
        if '!' in content:
            score += 0.1
        if '?' in content:
            score -= 0.05  # Questions are less urgent

        # Length-based adjustment (shorter messages might be more urgent)
        if len(content) < 50:
            score += 0.1

        return min(1.0, score)

    def _determine_priority_level(self, urgency_score: float, keywords: List[str]) -> str:
        """
        Determine priority level based on urgency score and keywords
        """
        # Check for explicit high priority keywords
        if any(k in self.high_priority_keywords for k in keywords):
            return 'HIGH'

        # Score-based classification
        if urgency_score >= 0.7:
            return 'HIGH'
        elif urgency_score >= 0.4:
            return 'MEDIUM'
        else:
            return 'LOW'

    def get_analytics_data(self, messages: List[Dict]) -> Dict:
        """
        Generate analytics data from analyzed messages
        """
        if not messages:
            return {}

        total_messages = len(messages)
        priority_messages = [
            m for m in messages if m.get('is_priority', 0) == 1]
        high_priority = [m for m in messages if m.get(
            'priority_level') == 'HIGH']

        # Calculate average urgency score
        urgency_scores = [m.get('urgency_score', 0)
                          for m in messages if m.get('urgency_score') is not None]
        avg_urgency = sum(urgency_scores) / \
            len(urgency_scores) if urgency_scores else 0

        # Collect all keywords
        all_keywords = []
        for msg in messages:
            keywords = msg.get('extracted_keywords', [])
            if isinstance(keywords, str):
                try:
                    keywords = json.loads(keywords)
                except:
                    keywords = []
            all_keywords.extend(keywords)

        # Count keyword frequencies
        keyword_counts = {}
        for keyword in all_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1

        top_keywords = sorted(keyword_counts.items(),
                              key=lambda x: x[1], reverse=True)[:10]

        return {
            'total_messages': total_messages,
            'priority_messages': len(priority_messages),
            'high_priority_messages': len(high_priority),
            'average_urgency_score': round(avg_urgency, 2),
            'priority_percentage': round(len(priority_messages) / total_messages * 100, 1),
            'top_keywords': top_keywords,
            'messages_with_deadlines': len([m for m in messages if m.get('deadline_extracted')])
        }


# Global analyzer instance
analyzer = MLMessageAnalyzer()
