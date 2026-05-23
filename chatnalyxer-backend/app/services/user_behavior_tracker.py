"""
User Behavior Tracker
Tracks and analyzes user interactions to personalize the JARVIS AI experience
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import User, UserInteraction, Notification, Event

logger = logging.getLogger(__name__)


class UserBehaviorTracker:
    """Track and analyze user behavior for personalization"""
    
    @staticmethod
    def track_interaction(
        db: Session,
        user_id: int,
        interaction_type: str,
        data: Optional[Dict] = None,
        notification_id: Optional[int] = None,
        event_id: Optional[int] = None
    ):
        """
        Track a user interaction
        
        Args:
            db: Database session
            user_id: User ID
            interaction_type: Type of interaction (notification_opened, time_confirmed, etc.)
            data: Additional context data
            notification_id: Related notification ID
            event_id: Related event ID
        """
        try:
            interaction = UserInteraction(
                user_id=user_id,
                interaction_type=interaction_type,
                interaction_data=data or {},
                notification_id=notification_id,
                event_id=event_id
            )
            
            db.add(interaction)
            db.commit()
            
            logger.info(f"📊 Tracked interaction: {interaction_type} for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error tracking interaction: {e}")
            db.rollback()
    
    @staticmethod
    def get_user_patterns(db: Session, user_id: int, days: int = 30) -> Dict:
        """
        Analyze user behavior patterns over the last N days
        
        Args:
            db: Database session
            user_id: User ID
            days: Number of days to analyze
        
        Returns:
            Dict with user behavior patterns
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Get all interactions in time period
            interactions = db.query(UserInteraction).filter(
                UserInteraction.user_id == user_id,
                UserInteraction.created_at >= cutoff_date
            ).all()
            
            if not interactions:
                return UserBehaviorTracker._default_patterns()
            
            # Calculate metrics
            notification_open_rate = UserBehaviorTracker._calculate_open_rate(db, user_id, cutoff_date)
            response_speed = UserBehaviorTracker._calculate_response_speed(interactions)
            engagement_level = UserBehaviorTracker._calculate_engagement(db, user_id, interactions)
            preferred_times = UserBehaviorTracker._get_active_hours(interactions)
            preferred_tone = UserBehaviorTracker._detect_preferred_tone(db, user_id)
            
            return {
                'notification_open_rate': notification_open_rate,
                'response_speed': response_speed,
                'engagement_level': engagement_level,
                'active_hours': preferred_times,
                'preferred_tone': preferred_tone,
                'total_interactions': len(interactions),
                'days_analyzed': days
            }
            
        except Exception as e:
            logger.error(f"Error analyzing user patterns: {e}")
            return UserBehaviorTracker._default_patterns()
    
    @staticmethod
    def _calculate_open_rate(db: Session, user_id: int, cutoff_date: datetime) -> float:
        """Calculate notification open rate"""
        try:
            sent = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.created_at >= cutoff_date,
                Notification.is_sent == True
            ).count()
            
            opened = db.query(UserInteraction).filter(
                UserInteraction.user_id == user_id,
                UserInteraction.interaction_type == 'notification_opened',
                UserInteraction.created_at >= cutoff_date
            ).count()
            
            return (opened / sent * 100) if sent > 0 else 0
            
        except Exception as e:
            logger.error(f"Error calculating open rate: {e}")
            return 0
    
    @staticmethod
    def _calculate_response_speed(interactions: List[UserInteraction]) -> str:
        """Calculate average response speed"""
        response_interactions = [
            i for i in interactions 
            if i.interaction_type in ['time_confirmed', 'user_responded', 'event_confirmed']
        ]
        
        if len(response_interactions) > 10:
            return 'fast'
        elif len(response_interactions) > 5:
            return 'medium'
        else:
            return 'slow'
    
    @staticmethod
    def _calculate_engagement(db: Session, user_id: int, interactions: List[UserInteraction]) -> int:
        """
        Calculate engagement score (0-100)
        Based on: opens, responses, confirmations, app usage
        """
        score = 0
        
        # Opens notifications: +2 points each
        opens = len([i for i in interactions if i.interaction_type == 'notification_opened'])
        score += opens * 2
        
        # Responds to questions: +5 points each
        responses = len([i for i in interactions if i.interaction_type == 'user_responded'])
        score += responses * 5
        
        # Confirms times: +3 points each
        confirmations = len([i for i in interactions if i.interaction_type == 'time_confirmed'])
        score += confirmations * 3
        
        # Daily app opens: +1 point each
        app_opens = len([i for i in interactions if i.interaction_type == 'app_opened'])
        score += app_opens
        
        # Event completions: +4 points each
        completions = len([i for i in interactions if i.interaction_type == 'event_completed'])
        score += completions * 4
        
        return min(score, 100)  # Cap at 100
    
    @staticmethod
    def _get_active_hours(interactions: List[UserInteraction]) -> Dict[int, int]:
        """Get user's most active hours"""
        hour_counts = {}
        
        for interaction in interactions:
            hour = interaction.created_at.hour
            hour_counts[hour] = hour_counts.get(hour, 0) + 1
        
        return hour_counts
    
    @staticmethod
    def _detect_preferred_tone(db: Session, user_id: int) -> str:
        """Detect user's preferred communication tone"""
        # Check user type
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return 'friendly'
        
        # Students generally prefer friendly
        if user.user_type == 'STUDENT':
            return 'friendly'
        # Professionals prefer professional
        elif user.user_type == 'PROFESSIONAL':
            return 'professional'
        # Casual users prefer casual
        else:
            return 'casual'
    
    @staticmethod
    def _default_patterns() -> Dict:
        """Default patterns for new users"""
        return {
            'notification_open_rate': 50,
            'response_speed': 'medium',
            'engagement_level': 50,
            'active_hours': {},
            'preferred_tone': 'friendly',
            'total_interactions': 0,
            'days_analyzed': 0
        }
    
    @staticmethod
    def get_optimal_send_time(db: Session, user_id: int) -> int:
        """
        Get optimal hour to send notifications based on user's active hours
        
        Args:
            db: Database session
            user_id: User ID
        
        Returns:
            Optimal hour (0-23)
        """
        patterns = UserBehaviorTracker.get_user_patterns(db, user_id)
        active_hours = patterns.get('active_hours', {})
        
        if not active_hours:
            # Default to 9 AM if no data
            return 9
        
        # Find most active hour
        most_active_hour = max(active_hours, key=active_hours.get)
        return most_active_hour
    
    @staticmethod
    def should_send_notification(
        db: Session,
        user_id: int,
        notification_type: str
    ) -> bool:
        """
        Decide if we should send this notification based on user engagement
        
        Args:
            db: Database session
            user_id: User ID
            notification_type: Type of notification (CRITICAL, HIGH, MEDIUM, LOW)
        
        Returns:
            bool: Whether to send notification
        """
        patterns = UserBehaviorTracker.get_user_patterns(db, user_id)
        engagement = patterns.get('engagement_level', 50)
        
        # High engagement users - send everything
        if engagement > 70:
            return True
        
        # Medium engagement - only important stuff
        elif engagement > 40:
            return notification_type in ['CRITICAL', 'HIGH']
        
        # Low engagement - only critical
        else:
            return notification_type == 'CRITICAL'


# Global tracker instance
behavior_tracker = UserBehaviorTracker()
