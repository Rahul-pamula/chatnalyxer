"""
JARVIS-Style Message Personalizer
Generates conversational, personalized notification messages using Gemini AI
"""

import google.generativeai as genai
import os
import json
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')


class MessagePersonalizer:
    """Generate personalized, conversational notification messages"""
    
    @staticmethod
    def generate_notification_message(
        user_name: str,
        event_type: str,
        event_details: Dict,
        user_context: Optional[Dict] = None
    ) -> Dict:
        """
        Generate a personalized notification message
        
        Args:
            user_name: User's name
            event_type: Type of event (exam, assignment, etc.)
            event_details: Details about the event
            user_context: User's preferences and behavior patterns
        
        Returns:
            Dict with title, body, tone, and action buttons
        """
        
        # Default user context
        if not user_context:
            user_context = {
                'engagement_level': 50,
                'preferred_tone': 'friendly',
                'past_success_rate': 80
            }
        
        prompt = f"""
You are JARVIS, a friendly AI assistant helping {user_name} stay organized.

User Context:
- Name: {user_name}
- Engagement level: {user_context.get('engagement_level', 50)}/100
- Preferred tone: {user_context.get('preferred_tone', 'friendly')}
- Past success rate: {user_context.get('past_success_rate', 80)}%

Event Information:
- Type: {event_type}
- Subject: {event_details.get('subject', 'Event')}
- Date: {event_details.get('date', 'Unknown')}
- Time: {event_details.get('time', 'Not specified')}
- Time is estimated: {event_details.get('time_is_estimated', False)}
- Priority: {event_details.get('priority', 'MEDIUM')}

Generate a notification message that:
1. Is conversational and friendly (like talking to a friend, not a robot)
2. Uses the user's name occasionally (but not too much)
3. If time is estimated, asks for confirmation in a friendly way
4. Uses 1-2 appropriate emojis (not excessive)
5. Is encouraging and supportive
6. Makes the user WANT to respond
7. Keeps it brief (2-3 sentences max)

Tone Guidelines:
- High engagement users (>70): Casual, fun, use more emojis
- Medium engagement (40-70): Friendly professional, balanced
- Low engagement (<40): Professional, direct, minimal emojis

Return ONLY valid JSON in this format:
{{
    "title": "Short catchy title with emoji",
    "body": "Main message (2-3 sentences, conversational)",
    "action_buttons": ["Button 1", "Button 2", "Button 3"],
    "tone": "friendly/encouraging/urgent"
}}

Examples:

For exam with time:
{{
    "title": "📚 Math Exam Tomorrow!",
    "body": "Hey {user_name}! Your Math exam is tomorrow at 10 AM. I've got your back with reminders. You got this! 💪",
    "action_buttons": ["Perfect! ✅", "Change time ⏰", "Dismiss"],
    "tone": "encouraging"
}}

For exam without time:
{{
    "title": "📚 Exam Alert!",
    "body": "Hey! I noticed you have an exam tomorrow, but the time wasn't mentioned. Based on your past exams (usually 9 AM), should I set a reminder for that? 🤔",
    "action_buttons": ["Yes, 9 AM ✅", "Different time ⏰", "I'll remember 🙅"],
    "tone": "friendly"
}}

For assignment:
{{
    "title": "📝 Assignment Due Soon!",
    "body": "Your History assignment is due tomorrow night. I'll remind you a few times so you don't miss it! 🎯",
    "action_buttons": ["Got it! ✅", "Snooze ⏰", "Done already 🎉"],
    "tone": "friendly"
}}

Now generate for the current event:
"""
        
        try:
            response = model.generate_content(prompt)
            result_text = response.text.strip()
            
            # Extract JSON from response
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(result_text)
            
            logger.info(f"✅ Generated personalized message: {result['title']}")
            return result
            
        except Exception as e:
            logger.error(f"Error generating personalized message: {e}")
            # Fallback to simple message
            return {
                "title": f"📅 {event_type.title()} Reminder",
                "body": f"You have a {event_type} coming up: {event_details.get('subject', 'Event')}",
                "action_buttons": ["OK", "Dismiss"],
                "tone": "neutral"
            }
    
    @staticmethod
    def generate_follow_up_message(
        user_name: str,
        event_type: str,
        event_subject: str,
        outcome: Optional[str] = None
    ) -> str:
        """
        Generate a follow-up message after an event
        
        Args:
            user_name: User's name
            event_type: Type of event
            event_subject: Subject of the event
            outcome: User's response (went_great, could_be_better, etc.)
        
        Returns:
            Personalized follow-up message
        """
        
        if outcome == "went_great":
            messages = [
                f"Awesome, {user_name}! 🎉 Knew you'd nail that {event_type}!",
                f"That's what I'm talking about! 💪 Great job on the {event_type}!",
                f"Fantastic! 🌟 Keep up the amazing work, {user_name}!"
            ]
        elif outcome == "could_be_better":
            messages = [
                f"No worries, {user_name}! Every experience is a learning opportunity. You'll do better next time! 💪",
                f"Hey, we all have those days! What matters is you showed up. Proud of you! 🌟",
                f"Don't be too hard on yourself! You've got this, and I'm here to help you prepare better next time! 🎯"
            ]
        else:
            messages = [
                f"Hey {user_name}! 👋 How did your {event_subject} go?",
                f"Hope your {event_type} went well! Let me know how it was! 😊",
                f"Checking in - how was the {event_subject}? 🤔"
            ]
        
        import random
        return random.choice(messages)
