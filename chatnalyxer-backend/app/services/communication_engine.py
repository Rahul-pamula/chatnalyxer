"""
Communication Engine
Determines HOW to communicate with users based on their behavior patterns
"""

import logging
from typing import Dict
from sqlalchemy.orm import Session

from .user_behavior_tracker import UserBehaviorTracker

logger = logging.getLogger(__name__)


class CommunicationEngine:
    """Personalize communication based on user behavior"""
    
    @staticmethod
    def get_communication_strategy(db: Session, user_id: int) -> Dict:
        """
        Determine best way to communicate with this specific user
        
        Args:
            db: Database session
            user_id: User ID
        
        Returns:
            Dict with communication strategy
        """
        try:
            # Get user behavior patterns
            patterns = UserBehaviorTracker.get_user_patterns(db, user_id)
            engagement_level = patterns.get('engagement_level', 50)
            preferred_tone = patterns.get('preferred_tone', 'friendly')
            
            # High engagement users (>70) - can be more casual and fun
            if engagement_level > 70:
                return {
                    'tone': 'casual_friendly',
                    'emoji_frequency': 'high',  # 2-3 emojis
                    'message_length': 'short',  # 2-3 sentences
                    'personalization': 'high',  # Use name, past context
                    'follow_up': True,  # Send follow-up messages
                    'reminder_frequency': 'high'  # More reminders
                }
            
            # Medium engagement (40-70) - balanced approach
            elif engagement_level > 40:
                return {
                    'tone': 'friendly_professional',
                    'emoji_frequency': 'medium',  # 1-2 emojis
                    'message_length': 'medium',  # 3-4 sentences
                    'personalization': 'medium',  # Use name occasionally
                    'follow_up': True,  # Send follow-up messages
                    'reminder_frequency': 'medium'  # Balanced reminders
                }
            
            # Low engagement (<40) - more direct, less frequent
            else:
                return {
                    'tone': 'professional',
                    'emoji_frequency': 'low',  # 0-1 emojis
                    'message_length': 'short',  # 1-2 sentences
                    'personalization': 'low',  # Minimal personalization
                    'follow_up': False,  # No follow-up messages
                    'reminder_frequency': 'low'  # Minimal reminders
                }
                
        except Exception as e:
            logger.error(f"Error getting communication strategy: {e}")
            # Default to friendly approach
            return {
                'tone': 'friendly',
                'emoji_frequency': 'medium',
                'message_length': 'medium',
                'personalization': 'medium',
                'follow_up': True,
                'reminder_frequency': 'medium'
            }
    
    @staticmethod
    def get_reminder_intervals(
        db: Session,
        user_id: int,
        event_type: str
    ) -> list:
        """
        Get personalized reminder intervals based on user engagement
        
        Args:
            db: Database session
            user_id: User ID
            event_type: Type of event
        
        Returns:
            List of reminder intervals in hours
        """
        strategy = CommunicationEngine.get_communication_strategy(db, user_id)
        frequency = strategy.get('reminder_frequency', 'medium')
        
        # Base intervals for event type
        if event_type == 'exam':
            base_intervals = [24, 3, 1, 0.25]  # 1 day, 3h, 1h, 15min
        elif event_type == 'assignment':
            base_intervals = [72, 24, 6, 1]  # 3 days, 1 day, 6h, 1h
        elif event_type == 'meeting':
            base_intervals = [1, 0.25]  # 1h, 15min
        else:
            base_intervals = [24, 1]  # 1 day, 1h
        
        # Adjust based on user engagement
        if frequency == 'high':
            # Add more reminders
            return base_intervals
        elif frequency == 'medium':
            # Keep as is
            return base_intervals[:-1] if len(base_intervals) > 2 else base_intervals
        else:  # low
            # Reduce reminders
            return base_intervals[:2] if len(base_intervals) > 2 else [base_intervals[0]]


# Global engine instance
communication_engine = CommunicationEngine()
