"""
Smart Message Processor
Integrates AI analysis, deadline extraction, event creation, and reminder scheduling
"""

import logging
from datetime import datetime
from typing import Dict, Optional
from sqlalchemy.orm import Session

from ..models import Message, User, Event
from .ai_analyzer import ai_analyzer
from .deadline_extractor import DeadlineExtractor
from .message_personalizer import MessagePersonalizer
from .reminder_scheduler import ReminderScheduler
from .push_service import send_push_notification

logger = logging.getLogger(__name__)


class SmartMessageProcessor:
    """Process messages with full JARVIS AI integration"""
    
    @staticmethod
    async def process_message(
        db: Session,
        message: Message,
        user: User
    ) -> Dict:
        """
        Complete message processing pipeline:
        1. Analyze message with AI
        2. Extract deadlines
        3. Create events if needed
        4. Send personalized notifications
        5. Schedule smart reminders
        
        Args:
            db: Database session
            message: Message to process
            user: User who owns the message
        
        Returns:
            Processing result with all details
        """
        try:
            logger.info(f"🔄 Processing message {message.id} for user {user.username}")
            
            # Step 1: AI Analysis
            analysis = ai_analyzer.analyze_text_message(
                content=message.content,
                created_at=message.created_at,
                user_type=user.user_type or "STUDENT"
            )
            
            priority = analysis.get('priority_level', 'LOW')
            logger.info(f"  📊 Priority: {priority}")
            
            # Step 2: Extract Deadline
            deadline_info = DeadlineExtractor.extract_deadline(
                message_text=message.content,
                current_date=datetime.now()
            )
            
            event_created = None
            reminders_scheduled = False
            
            # Step 3: Create Event if deadline found
            if deadline_info.get('has_deadline'):
                logger.info(f"  📅 Deadline found: {deadline_info.get('subject')}")
                
                event_datetime = DeadlineExtractor.combine_datetime(
                    date_str=deadline_info['deadline_date'],
                    time_str=deadline_info.get('deadline_time'),
                    event_type=deadline_info.get('event_type', 'event')
                )
                
                # Create event
                event = Event(
                    user_id=user.id,
                    title=deadline_info.get('subject', 'Event'),
                    description=message.content,
                    event_date=event_datetime.date(),
                    event_time=event_datetime.time(),
                    event_type=deadline_info.get('event_type'),
                    source='ai_detected',
                    source_message_id=message.id
                )
                
                db.add(event)
                db.commit()
                db.refresh(event)
                
                event_created = event
                logger.info(f"  ✅ Event created: {event.title}")
                
                # Step 4: Schedule Reminders
                reminders_scheduled = await ReminderScheduler.schedule_reminders(
                    db=db,
                    event=event,
                    user=user
                )
            
            # Step 5: Send Notification for HIGH/CRITICAL messages
            notification_sent = False
            if priority in ['HIGH', 'CRITICAL']:
                logger.info(f"  🔔 Sending {priority} priority notification")
                
                # Generate personalized message
                personalizer = MessagePersonalizer()
                
                if deadline_info.get('has_deadline'):
                    # Notification about deadline
                    notification_message = personalizer.generate_notification_message(
                        user_name=user.username,
                        event_type=deadline_info.get('event_type', 'event'),
                        event_details={
                            'subject': deadline_info.get('subject'),
                            'date': deadline_info.get('deadline_date'),
                            'time': deadline_info.get('deadline_time'),
                            'priority': priority,
                            'time_is_estimated': deadline_info.get('time_confidence') != 'high'
                        },
                        user_context={
                            'engagement_level': 70,  # TODO: Get from user behavior tracking
                            'preferred_tone': 'friendly'
                        }
                    )
                else:
                    # General high-priority notification
                    notification_message = {
                        'title': f"🔔 {priority} Priority Message",
                        'body': f"{message.content[:100]}...",
                        'tone': 'urgent' if priority == 'CRITICAL' else 'friendly'
                    }
                
                # Send push notification
                notification_sent = await send_push_notification(
                    db=db,
                    user_id=user.id,
                    title=notification_message['title'],
                    body=notification_message['body'],
                    data={
                        'messageId': message.id,
                        'eventId': event_created.id if event_created else None,
                        'priority': priority
                    },
                    priority=priority
                )
                
                if notification_sent:
                    logger.info(f"  ✅ Notification sent")
            
            # Return processing result
            return {
                'success': True,
                'analysis': analysis,
                'deadline_info': deadline_info,
                'event_created': event_created.id if event_created else None,
                'reminders_scheduled': reminders_scheduled,
                'notification_sent': notification_sent,
                'priority': priority
            }
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    async def process_batch_messages(
        db: Session,
        messages: list,
        user: User
    ) -> Dict:
        """
        Process multiple messages in batch
        
        Args:
            db: Database session
            messages: List of messages to process
            user: User who owns the messages
        
        Returns:
            Batch processing results
        """
        results = {
            'total': len(messages),
            'processed': 0,
            'events_created': 0,
            'notifications_sent': 0,
            'errors': 0
        }
        
        for message in messages:
            result = await SmartMessageProcessor.process_message(db, message, user)
            
            if result['success']:
                results['processed'] += 1
                if result.get('event_created'):
                    results['events_created'] += 1
                if result.get('notification_sent'):
                    results['notifications_sent'] += 1
            else:
                results['errors'] += 1
        
        logger.info(f"📊 Batch processing complete: {results}")
        return results


# Global processor instance
smart_processor = SmartMessageProcessor()
