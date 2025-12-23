"""
AI Deadline Extractor
Extracts deadlines, event types, and context from WhatsApp messages using Gemini AI
"""

import google.generativeai as genai
import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
import re

logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')


class DeadlineExtractor:
    """Extract deadlines and event information from messages"""
    
    @staticmethod
    def extract_deadline(message_text: str, current_date: Optional[datetime] = None) -> Dict:
        """
        Extract deadline information from message using AI
        
        Args:
            message_text: The message to analyze
            current_date: Current date/time for relative date calculation
        
        Returns:
            Dict with deadline info: {
                'has_deadline': bool,
                'deadline_date': str (ISO format),
                'deadline_time': str (HH:MM:SS),
                'event_type': str,
                'subject': str,
                'priority': str,
                'time_confidence': str,
                'time_source': str
            }
        """
        if not current_date:
            current_date = datetime.now()
        
        prompt = f"""
You are an AI assistant analyzing WhatsApp messages to extract deadline information.

Current date and time: {current_date.strftime('%Y-%m-%d %H:%M:%S')}
Current day of week: {current_date.strftime('%A')}

Message to analyze:
"{message_text}"

Extract the following information:

1. **has_deadline**: Does this message mention a deadline or event? (true/false)

2. **deadline_date**: The date in YYYY-MM-DD format
   - "tomorrow" = {(current_date + timedelta(days=1)).strftime('%Y-%m-%d')}
   - "today" = {current_date.strftime('%Y-%m-%d')}
   - "next week" = {(current_date + timedelta(days=7)).strftime('%Y-%m-%d')}
   - Handle specific dates like "21st December", "Dec 25", etc.

3. **deadline_time**: Time in HH:MM:SS format (24-hour)
   - If mentioned explicitly: use that time
   - If "morning": use 09:00:00
   - If "afternoon": use 14:00:00
   - If "evening": use 18:00:00
   - If "night": use 23:59:00
   - If not mentioned at all: null

4. **event_type**: Type of event
   - exam, assignment, meeting, class, deadline, event, birthday, appointment, etc.

5. **subject**: Brief description of what the event is about
   - For exam: "Math Exam", "Physics Final"
   - For assignment: "History Assignment", "Project Submission"

6. **priority**: Urgency level
   - CRITICAL: Exams, important deadlines within 24 hours
   - HIGH: Assignments, meetings, deadlines within 3 days
   - MEDIUM: Events within a week
   - LOW: Events more than a week away

7. **time_confidence**: How confident are you about the time?
   - high: Time explicitly mentioned
   - medium: Time inferred from context (morning, afternoon)
   - low: No time information, using default

8. **time_source**: Where did the time come from?
   - explicit: "at 10 AM", "2:30 PM"
   - inferred: "tomorrow morning", "tonight"
   - default: No time mentioned

Return ONLY valid JSON in this exact format:
{{
    "has_deadline": true,
    "deadline_date": "2025-12-24",
    "deadline_time": "10:00:00",
    "event_type": "exam",
    "subject": "Mathematics Final Exam",
    "priority": "CRITICAL",
    "time_confidence": "high",
    "time_source": "explicit"
}}

If no deadline is found, return:
{{
    "has_deadline": false,
    "deadline_date": null,
    "deadline_time": null,
    "event_type": null,
    "subject": null,
    "priority": "LOW",
    "time_confidence": "low",
    "time_source": "none"
}}
"""
        
        try:
            response = model.generate_content(prompt)
            result_text = response.text.strip()
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(result_text)
            
            logger.info(f"✅ Deadline extraction successful: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error extracting deadline: {e}")
            return {
                "has_deadline": False,
                "deadline_date": None,
                "deadline_time": None,
                "event_type": None,
                "subject": None,
                "priority": "LOW",
                "time_confidence": "low",
                "time_source": "none"
            }
    
    @staticmethod
    def get_smart_default_time(event_type: str) -> str:
        """
        Get smart default time based on event type
        """
        defaults = {
            'exam': '09:00:00',
            'class': '10:00:00',
            'assignment': '23:59:00',
            'meeting': '14:00:00',
            'deadline': '17:00:00',
            'appointment': '10:00:00',
            'event': '12:00:00',
        }
        return defaults.get(event_type, '09:00:00')
    
    @staticmethod
    def combine_datetime(date_str: str, time_str: Optional[str], event_type: str) -> datetime:
        """
        Combine date and time, using smart defaults if time is missing
        """
        if not time_str:
            time_str = DeadlineExtractor.get_smart_default_time(event_type)
        
        datetime_str = f"{date_str} {time_str}"
        return datetime.strptime(datetime_str, "%Y-%m-%d %H:%M:%S")
