import re
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dateutil import parser
from zoneinfo import ZoneInfo
import logging

logger = logging.getLogger(__name__)


class MLMessageAnalyzer:
    """
    ML-based message priority detection system for educational WhatsApp groups.
    Analyzes messages to detect submission deadlines, reporting times, and urgent notifications.
    """

    def __init__(self):
        # Timezone for India (IST)
        self.ist = ZoneInfo('Asia/Kolkata')

        # High priority keywords (immediate attention required)
        self.high_priority_keywords = [
            'urgent', 'asap', 'immediately', 'deadline', 'submission', 'submit', 'jaldi',
            'due today', 'due tomorrow', 'due tommorow', 'due tmrw', 'last chance', 'final notice',
            'emergency', 'critical', 'important announcement', 'alert', 'abhi', 'turant',
            'class cancel', 'class cancelled', 'no class', 'class nahi hai', 'sir not coming',
            'mam not coming', 'teacher absent', 'prof absent', 'faculty absent',
            'exam tomorrow', 'exam tmrw', 'test tomorrow', 'test tmrw', 'viva tomorrow',
            'submit today', 'submit abhi', 'send now', 'bhej do', 'final submission',
            'meeting tomorrow', 'meeting today', 'meeting at', 'important meeting'
        ]

        # Medium priority keywords (time-sensitive but not immediate)
        self.medium_priority_keywords = [
            'assignment', 'project', 'exam', 'test', 'quiz', 'report', 'assignment submit',
            'presentation', 'meeting', 'class', 'lecture', 'seminar', 'practical', 'lab',
            'workshop', 'due date', 'reminder', 'notice', 'update', 'internal', 'viva',
            'attendance', 'proxy', 'present', 'absent', 'bunk', 'lab report', 'journal',
            'sir', 'mam', 'prof', 'teacher', 'faculty', 'hod', 'principal',
            'syllabus', 'portion', 'notes', 'ppt', 'pdf', 'material', 'book',
            'marks', 'result', 'grade', 'cgpa', 'semester', 'unit test', 'mid sem',
            'end sem', 'final exam', 'practical exam', 'lab exam', 'oral exam'
        ]

        # Indian student specific terms and informal variations
        self.indian_student_terms = {
            # Class cancellation variations
            'class_cancel': ['no class', 'class cancel', 'class cancelled', 'class nahi', 'class off',
                             'sir not coming', 'mam not coming', 'teacher absent', 'faculty absent',
                             'prof absent', 'holiday', 'free period', 'no lecture'],

            # Submission related
            'submission': ['submit', 'submission', 'bhej do', 'send kar do', 'file send',
                           'pdf bhejo', 'assignment submit', 'project submit', 'report submit',
                           'upload kar do', 'email kar do', 'whatsapp pe bhej'],

            # Exam related
            'exam': ['exam', 'test', 'quiz', 'viva', 'practical exam', 'lab exam',
                     'internal', 'unit test', 'mid sem', 'end sem', 'final exam',
                     'oral exam', 'surprise test', 'assessment'],

            # Attendance and reporting
            'attendance': ['attendance', 'proxy', 'present', 'absent', 'bunk',
                           'attendance lena', 'proxy dena', 'mark present', 'attend karo'],

            # Meeting and schedule related
            'meeting': ['meeting', 'meet', 'discussion', 'conference', 'session',
                        'gathering', 'appointment', 'meeting tomorrow', 'meeting today',
                        'meeting at', 'important meeting', 'urgent meeting', 'class meeting',
                        'faculty meeting', 'project meeting', 'group meeting', 'team meeting'],

            # Time indicators
            'time_urgent': ['abhi', 'now', 'turant', 'jaldi', 'fast', 'quick',
                            'immediately', 'right now', 'asap'],

            # Common misspellings and variations
            'misspellings': ['tommorow', 'tommorrow', 'tmrw', 'assignmnt', 'submisn',
                             'attendnce', 'presnt', 'lectr', 'projct', 'reportt']
        }

        # Enhanced date patterns for Indian student context
        self.date_patterns = [
            # DD/MM/YYYY or DD-MM-YYYY (Indian format)
            r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b',
            r'\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{2,4})\b',
            # Hindi time references
            r'\b(today|tomorrow|tommorow|tommorrow|tonight|aaj|kal|parso)\b',
            r'\bdue\s+on\s+(\w+)\b',  # due on Monday
            r'\bdue\s+(\d{1,2})[/-](\d{1,2})\b',  # due 15/12
            r'\bby\s+(\d{1,2}:\d{2})\s*(am|pm)?\b',  # by 11:59 PM
            # tomorrow 1pm / kal 2 baje
            r'\b(tommorow|tomorrow|tmrw|kal)\s+(\d{1,2})\s*(am|pm|baje)\b',
            r'\bnext\s+(week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            r'\b(agle|next)\s+(hafte|week|monday|tuesday|wednesday|thursday|friday)\b',
            r'\b(\d{1,2})\s+(din|days?)\s+(mein|me|baad)\b',  # 2 din mein
            # Monday ko
            r'\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+ko\b',
            r'\bthis\s+(week|month)\s+end\b',  # this week end
            r'\b(\d{1,2})(st|nd|rd|th)?\s+(se|tak|by)\b'  # 15th tak
        ]

        # Enhanced time patterns with Indian context
        self.time_patterns = [
            r'\b(\d{1,2}):(\d{2})\s*(am|pm|baje)?\b',
            r'\b(\d{1,2})\s*(am|pm|baje)\b',
            r'\bbefore\s+(\d{1,2}:\d{2})\b',
            r'\bby\s+(\d{1,2}:\d{2})\b',
            r'\b(\d{1,2})\s+baje\s+(tak|by|se pehle)\b',  # 5 baje tak
            r'\b(morning|evening|afternoon|night)\s+(mein|me)\b',
            r'\b(subah|sham|dopahar|raat)\s+(mein|me|tak)\b'
        ]

    def analyze_message(self, content: str, created_at: datetime) -> Dict:
        """
        Analyze a message and return priority information.

        Args:
            content: Message content
            created_at: When the message was created

        Returns:
            Dict containing priority_level, urgency_score, deadline_extracted, extracted_keywords, is_priority
        """
        try:
            # Ensure created_at is in IST timezone
            created_at = created_at.astimezone(
                self.ist) if created_at.tzinfo else created_at.replace(tzinfo=self.ist)
            content_lower = content.lower()

            # Extract keywords
            keywords = self._extract_keywords(content_lower)

            # Calculate urgency score
            urgency_score = self._calculate_urgency_score(
                content_lower, keywords)

            # Determine priority level
            priority_level = self._determine_priority_level(
                urgency_score, keywords)

            # Extract deadline
            deadline = self._extract_deadline(content, created_at)

            # Detect message category and context
            message_category = self._detect_message_category(content_lower)
            academic_context = self._analyze_academic_context(
                content_lower, keywords)

            # Determine if this is a priority message
            is_priority = self._is_priority_message(
                priority_level, urgency_score, deadline, academic_context)

            return {
                'priority_level': priority_level,
                'urgency_score': urgency_score,
                'deadline_extracted': deadline,
                'extracted_keywords': json.dumps(keywords),
                'is_priority': 1 if is_priority else 0,
                'message_category': message_category,
                'academic_context': json.dumps(academic_context)
            }

        except Exception as e:
            logger.error(f"Error analyzing message: {e}")
            return {
                'priority_level': 'MEDIUM',
                'urgency_score': 0.5,
                'deadline_extracted': None,
                'extracted_keywords': json.dumps([]),
                'is_priority': 0,
                'message_category': 'GENERAL',
                'academic_context': json.dumps({})
            }

    def _extract_keywords(self, content: str) -> List[str]:
        """Extract relevant keywords from message content."""
        keywords = []

        # Check for high priority keywords
        for keyword in self.high_priority_keywords:
            if keyword in content:
                keywords.append(keyword)

        # Check for medium priority keywords
        for keyword in self.medium_priority_keywords:
            if keyword in content:
                keywords.append(keyword)

        # Also check for Indian student specific terms
        for category, terms in self.indian_student_terms.items():
            for term in terms:
                if term in content:
                    keywords.append(f"{category}:{term}")

        return list(set(keywords))  # Remove duplicates

    def _calculate_urgency_score(self, content: str, keywords: List[str]) -> float:
        """
        Calculate urgency score from 0.0 to 1.0 based on content analysis.
        """
        score = 0.0

        # Base score from keywords
        high_priority_count = sum(
            1 for kw in keywords if kw in self.high_priority_keywords)
        medium_priority_count = sum(
            1 for kw in keywords if kw in self.medium_priority_keywords)

        # High priority keywords contribute more to score
        score += high_priority_count * 0.3
        score += medium_priority_count * 0.15

        # Additional scoring factors with Indian context
        if any(term in content for term in ['urgent', 'asap', 'jaldi', 'turant', 'abhi']):
            score += 0.4

        if any(term in content for term in ['deadline', 'due', 'submit']):
            score += 0.3

        if any(term in content for term in ['today', 'tomorrow', 'tmrw', 'aaj', 'kal']):
            score += 0.35

        if any(term in content for term in ['submission', 'submit', 'bhej do', 'send kar do']):
            score += 0.25

        if any(term in content for term in ['exam', 'test', 'viva', 'internal']):
            score += 0.2

        # Class cancellation gets high priority
        if any(term in content for term in self.indian_student_terms['class_cancel']):
            score += 0.45

        # Attendance related urgency
        if any(term in content for term in self.indian_student_terms['attendance']):
            score += 0.15

        # Meeting related urgency (especially with time/place)
        if any(term in content for term in self.indian_student_terms['meeting']):
            score += 0.25
            # Extra score for meetings with specific time
            if any(time_word in content.lower() for time_word in ['tomorrow', 'today', 'at', 'am', 'pm', 'kal']):
                score += 0.15

        # Exclamation marks indicate urgency
        exclamation_count = content.count('!')
        score += min(exclamation_count * 0.05, 0.15)

        # ALL CAPS words indicate urgency
        caps_words = re.findall(r'\b[A-Z]{3,}\b', content)
        score += min(len(caps_words) * 0.03, 0.1)

        # Ensure score is between 0.0 and 1.0
        return min(score, 1.0)

    def _determine_priority_level(self, urgency_score: float, keywords: List[str]) -> str:
        """
        Determine priority level based on urgency score and keywords with enhanced academic context.
        """
        # Check for explicit high priority indicators (enhanced for Indian context)
        high_priority_indicators = ['urgent', 'asap', 'emergency', 'critical', 'deadline',
                                    'jaldi', 'turant', 'abhi', 'class_cancel', 'exam']

        # Class cancellation is always high priority
        if any('class_cancel:' in kw for kw in keywords):
            return 'HIGH'

        # Immediate submission deadlines
        if any(indicator in ''.join(keywords).lower() for indicator in ['submit today', 'due today', 'abhi submit']):
            return 'HIGH'

        if any(indicator in ''.join(keywords).lower() for indicator in high_priority_indicators):
            return 'HIGH'

        # Enhanced score-based classification
        if urgency_score >= 0.7:
            return 'HIGH'
        elif urgency_score >= 0.4:
            return 'MEDIUM'
        else:
            return 'LOW'

    def _extract_deadline(self, content: str, created_at: datetime) -> Optional[datetime]:
        """
        Extract deadline from message content using pattern matching and NLP.
        """
        content_lower = content.lower()

        # Check for relative dates (including Hindi terms)
        if any(term in content_lower for term in ['today', 'aaj']):
            return created_at.replace(hour=23, minute=59, second=59)

        if any(term in content_lower for term in ['tomorrow', 'tommorow', 'tommorrow', 'tmrw', 'kal']):
            tomorrow = created_at + timedelta(days=1)
            return tomorrow.replace(hour=23, minute=59, second=59)

        if any(term in content_lower for term in ['parso', 'day after tomorrow']):
            day_after_tomorrow = created_at + timedelta(days=2)
            return day_after_tomorrow.replace(hour=23, minute=59, second=59)

        # Check for "X din mein" (in X days)
        days_pattern = re.search(
            r'(\d+)\s+(din|days?)\s+(mein|me|baad)', content_lower)
        if days_pattern:
            days = int(days_pattern.group(1))
            future_date = created_at + timedelta(days=days)
            return future_date.replace(hour=23, minute=59, second=59)

        # Extract specific dates using patterns
        for pattern in self.date_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                try:
                    # Try to parse the matched date
                    date_str = match.group(0)
                    parsed_date = parser.parse(date_str, fuzzy=True)

                    # Localize to IST timezone
                    parsed_date = parsed_date.replace(tzinfo=self.ist)

                    # If the parsed date is in the past, assume it's for next year
                    if parsed_date < created_at:
                        parsed_date = parsed_date.replace(
                            year=created_at.year + 1)

                    return parsed_date

                except Exception:
                    continue

        return None

    def _detect_message_category(self, content: str) -> str:
        """
        Detect the category of the message based on content.
        Returns: CLASS_CANCEL, SUBMISSION, EXAM, ATTENDANCE, GENERAL
        """
        content_lower = content.lower()

        # Class cancellation detection
        if any(term in content_lower for term in self.indian_student_terms['class_cancel']):
            return 'CLASS_CANCEL'

        # Submission detection
        if any(term in content_lower for term in self.indian_student_terms['submission']):
            return 'SUBMISSION'

        # Exam detection
        if any(term in content_lower for term in self.indian_student_terms['exam']):
            return 'EXAM'

        # Attendance detection
        if any(term in content_lower for term in self.indian_student_terms['attendance']):
            return 'ATTENDANCE'

        return 'GENERAL'

    def _analyze_academic_context(self, content: str, keywords: List[str]) -> Dict:
        """
        Analyze academic context and extract relevant information.
        Enhanced to better distinguish real academic content from casual messages.
        """
        context = {
            'has_deadline': False,
            'is_urgent': False,
            'involves_faculty': False,
            'subject_mentioned': False,
            'academic_action': None,
            'message_length': len(content.split()),
            'has_context': False
        }

        # Check for deadline indicators with context
        deadline_indicators = ['due', 'deadline',
                               'submit', 'by', 'before', 'tak']
        if any(indicator in content for indicator in deadline_indicators):
            context['has_deadline'] = True
            context['has_context'] = True

        # Check for urgency with context
        urgency_indicators = ['urgent', 'asap',
                              'jaldi', 'turant', 'abhi', 'immediately']
        if any(indicator in content for indicator in urgency_indicators):
            context['is_urgent'] = True
            context['has_context'] = True

        # Check for faculty involvement
        faculty_terms = ['sir', 'mam', 'prof',
                         'teacher', 'faculty', 'hod', 'principal']
        if any(term in content for term in faculty_terms):
            context['involves_faculty'] = True
            context['has_context'] = True

        # Check for substantial academic content (not just single words)
        academic_indicators = [
            'assignment', 'project', 'homework', 'exam', 'test', 'quiz', 'viva',
            'practical', 'lab', 'class', 'lecture', 'seminar', 'presentation',
            'meeting', 'discussion', 'conference', 'session'
        ]
        academic_count = sum(
            1 for term in academic_indicators if term in content.lower())
        if academic_count >= 1 and context['message_length'] >= 3:
            context['has_context'] = True

        # Special case: meetings with time and place are always important
        if ('meeting' in content.lower() and
            any(time_word in content.lower() for time_word in ['tomorrow', 'today', 'at', 'am', 'pm']) and
                context['message_length'] >= 5):
            context['has_context'] = True
            context['is_urgent'] = True

        # Detect academic actions with better context
        if any(term in content for term in ['submit', 'submission', 'bhej', 'send']) and context['has_deadline']:
            context['academic_action'] = 'SUBMIT'
        elif any(term in content for term in ['attend', 'present', 'proxy']) and context['involves_faculty']:
            context['academic_action'] = 'ATTEND'
        elif any(term in content for term in ['study', 'prepare', 'syllabus', 'notes']) and context['message_length'] >= 4:
            context['academic_action'] = 'STUDY'
        elif any(term in content.lower() for term in ['class cancel', 'no class', 'class off']):
            context['academic_action'] = 'CLASS_CANCEL'
            context['has_context'] = True
        elif any(term in content.lower() for term in ['meeting', 'meet', 'discussion', 'conference']):
            context['academic_action'] = 'MEETING'
            context['has_context'] = True

        # Single word messages are rarely priority unless very specific
        if context['message_length'] <= 1:
            context['has_context'] = False

        return context

    def _calculate_deadline_proximity_score(self, deadline: Optional[datetime]) -> float:
        """
        Calculate additional urgency based on how close the deadline is.
        """
        if not deadline:
            return 0.0

        now = datetime.now(self.ist)
        time_diff = deadline - now
        hours_until_deadline = time_diff.total_seconds() / 3600

        # Very urgent if deadline is within 2 hours
        if hours_until_deadline <= 2:
            return 0.5
        # Urgent if deadline is within 24 hours
        elif hours_until_deadline <= 24:
            return 0.3
        # Moderately urgent if deadline is within 72 hours
        elif hours_until_deadline <= 72:
            return 0.2
        # Slightly urgent if deadline is within a week
        elif hours_until_deadline <= 168:  # 7 days
            return 0.1
        else:
            return 0.0

    def _is_priority_message(self, priority_level: str, urgency_score: float, deadline: Optional[datetime], academic_context: Dict = None) -> bool:
        """
        Determine if a message should be considered priority based on multiple factors.
        Lowered thresholds for better priority detection.
        """
        if academic_context is None:
            academic_context = {}

        # Add deadline proximity to urgency score
        deadline_score = self._calculate_deadline_proximity_score(deadline)
        total_urgency = urgency_score + deadline_score

        # HIGH priority messages with context are priority
        if priority_level == 'HIGH' and academic_context.get('has_context', False):
            return True

        # Medium priority with moderate urgency score
        if priority_level == 'MEDIUM' and total_urgency >= 0.5:
            return True

        # Messages with deadlines within 3 days
        if deadline:
            days_until_deadline = (deadline - datetime.now()).days
            if days_until_deadline <= 3 and total_urgency >= 0.3:
                return True

        # High urgency score regardless of priority level
        if total_urgency >= 0.7:
            return True

        # Academic context based priority
        if (academic_context.get('is_urgent', False) and
            academic_context.get('has_deadline', False) and
                total_urgency >= 0.4):
            return True

        # Faculty involvement with moderate urgency
        if (academic_context.get('involves_faculty', False) and
                total_urgency >= 0.4):
            return True

        # Class cancellations are always priority
        if academic_context.get('academic_action') == 'CLASS_CANCEL':
            return True

        return False

    def get_priority_messages_filter(self) -> str:
        """
        Return SQL WHERE clause to filter only priority messages.
        """
        return "is_priority = 1 OR priority_level = 'HIGH' OR urgency_score >= 0.7"

    def get_analytics_data(self, messages: List[Dict]) -> Dict:
        """
        Generate analytics data for visualization dashboard.
        """
        if not messages:
            return {
                'total_messages': 0,
                'priority_distribution': {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0},
                'category_distribution': {'CLASS_CANCEL': 0, 'SUBMISSION': 0, 'EXAM': 0, 'ATTENDANCE': 0, 'GENERAL': 0},
                'urgency_score_avg': 0.0,
                'messages_with_deadlines': 0,
                'top_keywords': [],
                'urgent_categories': []
            }

        total_messages = len(messages)
        priority_counts = {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        category_counts = {'CLASS_CANCEL': 0, 'SUBMISSION': 0,
                           'EXAM': 0, 'ATTENDANCE': 0, 'GENERAL': 0}
        urgency_scores = []
        all_keywords = []
        deadline_count = 0
        urgent_categories = []

        for msg in messages:
            # Count priority levels
            priority = msg.get('priority_level', 'MEDIUM')
            priority_counts[priority] += 1

            # Count message categories
            category = msg.get('message_category', 'GENERAL')
            if category in category_counts:
                category_counts[category] += 1
            else:
                category_counts['GENERAL'] += 1

            # Track urgent categories
            if msg.get('is_priority', 0) == 1 and category != 'GENERAL':
                urgent_categories.append(category)

            # Collect urgency scores
            urgency_scores.append(msg.get('urgency_score', 0.5))

            # Count messages with deadlines
            if msg.get('deadline_extracted'):
                deadline_count += 1

            # Collect keywords
            keywords_str = msg.get('extracted_keywords', '[]')
            try:
                keywords = json.loads(keywords_str)
                all_keywords.extend(keywords)
            except:
                pass

        # Calculate top keywords
        keyword_counts = {}
        for keyword in all_keywords:
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1

        top_keywords = sorted(keyword_counts.items(),
                              key=lambda x: x[1], reverse=True)[:10]

        # Count urgent categories
        urgent_category_counts = {}
        for cat in urgent_categories:
            urgent_category_counts[cat] = urgent_category_counts.get(
                cat, 0) + 1

        sorted_urgent_categories = sorted(
            urgent_category_counts.items(), key=lambda x: x[1], reverse=True)

        return {
            'total_messages': total_messages,
            'priority_distribution': priority_counts,
            'category_distribution': category_counts,
            'urgency_score_avg': sum(urgency_scores) / len(urgency_scores) if urgency_scores else 0.0,
            'messages_with_deadlines': deadline_count,
            'top_keywords': top_keywords,
            # Top 5 urgent categories
            'urgent_categories': sorted_urgent_categories[:5]
        }
