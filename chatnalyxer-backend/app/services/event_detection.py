import google.generativeai as genai
import os
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

async def detect_events_from_text(text: str, user_type: str = "CASUAL") -> List[Dict]:
    """
    Use AI to detect events, deadlines, and important dates from text.
    
    Args:
        text: The text content to analyze (from PDF, message, etc.)
        user_type: User's profile type (STUDENT, FACULTY, CASUAL) for context
        
    Returns:
        List of detected events with structured data
    """
    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        
        # Create context-aware prompt based on user type
        context = {
            "STUDENT": "assignments, exams, project deadlines, class schedules, study sessions",
            "FACULTY": "meetings, lectures, grading deadlines, faculty meetings, office hours",
            "CASUAL": "appointments, reminders, important dates, meetings"
        }.get(user_type, "events and deadlines")
        
        prompt = f"""
You are an AI assistant helping to extract events and deadlines from text.
User type: {user_type} (focus on {context})

Analyze the following text and extract ALL events, deadlines, and important dates.
For each event, provide:
1. title: Brief, clear title (max 100 chars)
2. description: Detailed description
3. date: Date in YYYY-MM-DD format
4. time: Time in HH:MM format (24-hour), or null if not specified
5. location: Location if mentioned, or null
6. is_all_day: true if no specific time mentioned
7. reminder_minutes: Suggested reminder time (30, 60, 1440 for 1 day, etc.)

TEXT TO ANALYZE:
{text}

Respond ONLY with a JSON array of events. If no events found, return empty array [].
Example format:
[
  {{
    "title": "Submit Assignment 3",
    "description": "Complete and submit the Machine Learning assignment on neural networks",
    "date": "2025-12-20",
    "time": "23:59",
    "location": null,
    "is_all_day": false,
    "reminder_minutes": 1440
  }}
]
"""

        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', result_text, re.DOTALL)
        if json_match:
            result_text = json_match.group(1)
        
        # Parse JSON
        events = json.loads(result_text)
        
        # Validate and clean events
        validated_events = []
        for event in events:
            try:
                # Validate required fields
                if not event.get('title') or not event.get('date'):
                    continue
                
                # Validate date format
                datetime.strptime(event['date'], '%Y-%m-%d')
                
                # Validate time format if provided
                if event.get('time'):
                    datetime.strptime(event['time'], '%H:%M')
                
                validated_events.append(event)
            except Exception as e:
                logger.warning(f"Skipping invalid event: {e}")
                continue
        
        logger.info(f"Detected {len(validated_events)} events from text")
        return validated_events
    
    except Exception as e:
        logger.error(f"Event detection failed: {e}")
        return []


async def create_events_from_detection(
    detected_events: List[Dict],
    user_id: int,
    source_message_id: Optional[int],
    db
) -> List:
    """
    Create Event records in database from AI-detected events.
    
    Args:
        detected_events: List of event dicts from detect_events_from_text
        user_id: User ID to associate events with
        source_message_id: Optional message ID that triggered detection
        db: Database session
        
    Returns:
        List of created Event objects
    """
    from .. import models
    
    created_events = []
    
    for event_data in detected_events:
        try:
            event = models.Event(
                user_id=user_id,
                title=event_data['title'],
                description=event_data.get('description'),
                event_date=datetime.strptime(event_data['date'], '%Y-%m-%d').date(),
                event_time=datetime.strptime(event_data['time'], '%H:%M').time() if event_data.get('time') else None,
                location=event_data.get('location'),
                is_all_day=event_data.get('is_all_day', False),
                reminder_minutes=event_data.get('reminder_minutes', 30),
                source='ai_detected',
                source_message_id=source_message_id
            )
            
            db.add(event)
            created_events.append(event)
            
        except Exception as e:
            logger.error(f"Failed to create event: {e}")
            continue
    
    if created_events:
        db.commit()
        logger.info(f"Created {len(created_events)} events in database")
        
        # Schedule reminders for each event
        try:
            from .notification_service import schedule_event_reminders
            for event in created_events:
                await schedule_event_reminders(event.id, db)
        except Exception as e:
            logger.error(f"Failed to schedule reminders: {e}")
    
    return created_events
