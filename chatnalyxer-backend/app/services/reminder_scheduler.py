"""
Smart Reminder Scheduler
Schedules and manages reminders for events using APScheduler
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from datetime import datetime, timedelta
import logging
from typing import List, Dict
from sqlalchemy.orm import Session

from ..models import Event, User, Notification
from .push_service import send_push_notification
from .message_personalizer import MessagePersonalizer

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = BackgroundScheduler()
scheduler.start()


class ReminderScheduler:
    """Schedule and manage smart reminders"""
    
    @staticmethod
    def get_reminder_intervals(event_type: str, time_until_event: timedelta) -> List[Dict]:
        """
        Get smart reminder intervals based on event type and time until event
        
        Args:
            event_type: Type of event (exam, assignment, etc.)
            time_until_event: Time remaining until event
        
        Returns:
            List of reminder intervals with labels
        """
        total_hours = time_until_event.total_seconds() / 3600
        
        reminders = []
        
        # For exams - more aggressive reminders
        if event_type == 'exam':
            if total_hours > 24:
                reminders.append({'hours_before': 24, 'label': '1 day before'})
            if total_hours > 3:
                reminders.append({'hours_before': 3, 'label': '3 hours before'})
            if total_hours > 1:
                reminders.append({'hours_before': 1, 'label': '1 hour before'})
            if total_hours > 0.25:
                reminders.append({'hours_before': 0.25, 'label': '15 minutes before'})
        
        # For assignments - deadline-focused
        elif event_type == 'assignment':
            if total_hours > 72:
                reminders.append({'hours_before': 72, 'label': '3 days before'})
            if total_hours > 24:
                reminders.append({'hours_before': 24, 'label': '1 day before'})
            if total_hours > 6:
                reminders.append({'hours_before': 6, 'label': '6 hours before'})
            if total_hours > 1:
                reminders.append({'hours_before': 1, 'label': '1 hour before'})
        
        # For meetings - just-in-time
        elif event_type == 'meeting':
            if total_hours > 1:
                reminders.append({'hours_before': 1, 'label': '1 hour before'})
            if total_hours > 0.25:
                reminders.append({'hours_before': 0.25, 'label': '15 minutes before'})
        
        # Default for other events
        else:
            if total_hours > 24:
                reminders.append({'hours_before': 24, 'label': '1 day before'})
            if total_hours > 1:
                reminders.append({'hours_before': 1, 'label': '1 hour before'})
        
        return reminders
    
    @staticmethod
    async def schedule_reminders(db: Session, event: Event, user: User):
        """
        Schedule multiple reminders for an event
        
        Args:
            db: Database session
            event: Event to schedule reminders for
            user: User to send reminders to
        """
        try:
            # Combine date and time
            event_datetime = datetime.combine(event.event_date, event.event_time)
            time_until_event = event_datetime - datetime.now()
            
            # Get reminder intervals
            intervals = ReminderScheduler.get_reminder_intervals(
                event.event_type or 'event',
                time_until_event
            )
            
            logger.info(f"📅 Scheduling {len(intervals)} reminders for event: {event.title}")
            
            # Schedule each reminder
            for interval in intervals:
                reminder_time = event_datetime - timedelta(hours=interval['hours_before'])
                
                # Only schedule if in the future
                if reminder_time > datetime.now():
                    scheduler.add_job(
                        ReminderScheduler.send_reminder,
                        trigger=DateTrigger(run_date=reminder_time),
                        args=[db, user.id, event.id, interval['label']],
                        id=f"reminder_{event.id}_{interval['label'].replace(' ', '_')}",
                        replace_existing=True
                    )
                    
                    logger.info(f"  ⏰ Scheduled: {interval['label']} at {reminder_time}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling reminders: {e}")
            return False
    
    @staticmethod
    async def send_reminder(db: Session, user_id: int, event_id: int, label: str):
        """
        Send a reminder notification
        
        Args:
            db: Database session
            user_id: User ID
            event_id: Event ID
            label: Reminder label (e.g., "1 hour before")
        """
        try:
            # Get event and user
            event = db.query(Event).filter(Event.id == event_id).first()
            user = db.query(User).filter(User.id == user_id).first()
            
            if not event or not user:
                logger.error(f"Event or user not found: event_id={event_id}, user_id={user_id}")
                return
            
            # Generate personalized message
            personalizer = MessagePersonalizer()
            message = personalizer.generate_notification_message(
                user_name=user.username,
                event_type=event.event_type or 'event',
                event_details={
                    'subject': event.title,
                    'date': event.event_date.strftime('%Y-%m-%d'),
                    'time': event.event_time.strftime('%H:%M:%S'),
                    'priority': 'HIGH',
                    'time_is_estimated': False
                }
            )
            
            # Add reminder context to body
            body = f"{label.title()} - {message['body']}"
            
            # Send push notification
            await send_push_notification(
                db=db,
                user_id=user_id,
                title=message['title'],
                body=body,
                data={
                    'eventId': event_id,
                    'type': 'reminder',
                    'label': label
                },
                priority='HIGH'
            )
            
            logger.info(f"✅ Sent reminder: {label} for event {event.title}")
            
        except Exception as e:
            logger.error(f"Error sending reminder: {e}")
    
    @staticmethod
    def cancel_reminders(event_id: int):
        """
        Cancel all reminders for an event
        
        Args:
            event_id: Event ID
        """
        try:
            # Get all jobs for this event
            jobs = scheduler.get_jobs()
            cancelled_count = 0
            
            for job in jobs:
                if f"reminder_{event_id}_" in job.id:
                    job.remove()
                    cancelled_count += 1
            
            logger.info(f"🗑️ Cancelled {cancelled_count} reminders for event {event_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error cancelling reminders: {e}")
            return False
