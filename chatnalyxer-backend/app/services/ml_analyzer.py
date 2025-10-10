import re
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dateutil import parser
from zoneinfo import ZoneInfo
import logging
import google.generativeai as genai
from ..config import settings

logger = logging.getLogger(__name__)

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)


class MLMessageAnalyzer:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash')

        # Keyword patterns for fallback analysis
        self.high_priority_keywords = [
            'urgent', 'asap', 'deadline', 'submission', 'due today', 'emergency',
            'critical', 'immediate', 'now', 'today', 'tonight', 'last chance'
        ]

        self.medium_priority_keywords = [
            'assignment', 'exam', 'test', 'project', 'meeting', 'reminder',
            'important', 'attention', 'notice', 'required', 'mandatory'
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
        Main method to analyze a message using Gemini API and fallback logic
        """
        try:
            # Use Gemini API for intelligent analysis
            gemini_result = self._analyze_with_gemini(content)

            # Extract additional information using pattern matching
            keywords = self._extract_keywords(content)
            deadline = self._extract_deadline(content, created_at)

            # Combine Gemini results with pattern-based analysis
            analysis = {
                'priority_level': gemini_result.get('priority_level', 'MEDIUM'),
                'urgency_score': gemini_result.get('urgency_score', 0.5),
                'deadline_extracted': deadline,
                'extracted_keywords': keywords,
                'is_priority': 1 if gemini_result.get('priority_level') == 'HIGH' else 0,
                'gemini_analysis': gemini_result,
                'analysis_method': 'gemini'
            }

            logger.info(
                f"🚨 PRIORITY MESSAGE detected: {content[:50]}... (Priority: {analysis['priority_level']}, Score: {analysis['urgency_score']})")

            return analysis

        except Exception as e:
            logger.error(f"Gemini API analysis failed: {e}")
            # Fallback to pattern-based analysis
            return self._fallback_analysis(content, created_at)

    def _analyze_with_gemini(self, content: str) -> Dict:
        """
        Use Gemini API to analyze message priority and urgency
        """
        prompt = f"""
        Analyze this WhatsApp message from an educational group and determine its priority level.
        
        Message: "{content}"
        
        Instructions:
        1. Determine if this is HIGH, MEDIUM, or LOW priority for students
        2. Assign an urgency score from 0.0 (not urgent) to 1.0 (extremely urgent)
        3. Consider educational context: assignments, exams, deadlines, submissions, meetings
        4. Look for time-sensitive information and urgent language
        
        Return ONLY a JSON object with this exact format:
        {{
            "priority_level": "HIGH|MEDIUM|LOW",
            "urgency_score": 0.0-1.0,
            "reasoning": "brief explanation"
        }}
        """

        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()

            # Clean up response (remove markdown code blocks if present)
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            result = json.loads(response_text)
            return result

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise e

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
