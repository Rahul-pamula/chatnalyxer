from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List
import httpx
import logging
import os

logger = logging.getLogger(__name__)

# Expo Push Notification endpoint
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Global scheduler instance
scheduler = None

async def send_expo_push_notification(push_token: str, title: str, body: str, data: dict = None):
    """
    Send a push notification via Expo Push Notification service.
    
    Args:
        push_token: Expo push token (starts with ExponentPushToken[...])
        title: Notification title
        body: Notification body/message
        data: Optional additional data
    """
    try:
        payload = {
            "to": push_token,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "data": data or {}
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(EXPO_PUSH_URL, json=payload, timeout=10.0)
            response.raise_for_status()
            result = response.json()
            
            if result.get("data", {}).get("status") == "ok":
                logger.info(f"Push notification sent successfully to {push_token[:20]}...")
                return True
            else:
                logger.error(f"Push notification failed: {result}")
                return False
                
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return False


async def check_and_send_notifications(db: Session):
    """
    Check for pending notifications and send them.
    Called periodically by the scheduler.
    """
    from .. import models
    
    try:
        now = datetime.now()
        
        # Get notifications that should be sent now
        pending_notifications = db.query(models.Notification).filter(
            models.Notification.is_sent == False,
            models.Notification.scheduled_time <= now
        ).all()
        
        if not pending_notifications:
            return
        
        logger.info(f"Found {len(pending_notifications)} notifications to send")
        
        for notification in pending_notifications:
            try:
                # Get user's push token
                user = db.query(models.User).filter(
                    models.User.id == notification.user_id
                ).first()
                
                if not user or not user.push_token:
                    logger.warning(f"No push token for user {notification.user_id}")
                    notification.is_sent = True
                    notification.sent_at = now
                    continue
                
                # Send notification
                success = await send_expo_push_notification(
                    push_token=user.push_token,
                    title=notification.title,
                    body=notification.message,
                    data={
                        "type": notification.notification_type,
                        "event_id": notification.related_event_id,
                        "message_id": notification.related_message_id
                    }
                )
                
                # Mark as sent
                notification.is_sent = True
                notification.sent_at = now
                
                if success:
                    logger.info(f"Sent notification: {notification.title}")
                
            except Exception as e:
                logger.error(f"Error sending notification {notification.id}: {e}")
                continue
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error in notification checker: {e}")
        db.rollback()


async def schedule_event_reminders(event_id: int, db: Session):
    """
    Create notification records for an event based on reminder settings.
    
    Args:
        event_id: Event ID to create reminders for
        db: Database session
    """
    from .. import models
    
    try:
        event = db.query(models.Event).filter(models.Event.id == event_id).first()
        
        if not event:
            return
        
        # Calculate notification time
        event_datetime = datetime.combine(event.event_date, event.event_time or datetime.min.time())
        reminder_time = event_datetime - timedelta(minutes=event.reminder_minutes)
        
        # Don't schedule if reminder time is in the past, UNLESS it's very recent, 
        # but for manual events user wants to see it in the list regardless.
        # So if reminder is in past, set it to now + 1 min so it triggers immediately?
        # Or just let it be created with past time so it shows up in list but might not push
        
        if reminder_time <= datetime.now():
            # If the calculated reminder time is in the past:
            # 1. If it's less than 1 hour ago, maybe still user wants to know?
            # 2. If it is way in the past (e.g. yesterday), DO NOT schedule it.
            
            time_diff = datetime.now() - reminder_time
            if time_diff.total_seconds() > 3600: # If more than 1 hour late
                 logger.info(f"Skipping reminder for event {event_id} as it is {time_diff} in the past.")
                 return
            
            # If slightly late, adjust to immediate
            logger.info(f"Reminder time for event {event_id} was slightly in past, adjusting to now")
            reminder_time = datetime.now() + timedelta(seconds=10)
        
        # Create notification
        notification = models.Notification(
            user_id=event.user_id,
            title=f"Reminder: {event.title}",
            message=f"{event.description or event.title} is coming up on {event.event_date}",
            scheduled_time=reminder_time,
            notification_type="event_reminder",
            related_event_id=event.id
        )
        
        db.add(notification)
        db.commit()
        
        logger.info(f"Scheduled reminder for event {event_id} at {reminder_time}")
        
    except Exception as e:
        logger.error(f"Failed to schedule event reminder: {e}")
        db.rollback()


def start_notification_scheduler(db_session_factory):
    """
    Start the background scheduler for checking and sending notifications.
    
    Args:
        db_session_factory: Function that returns a database session
    """
    global scheduler
    
    if scheduler is not None:
        logger.warning("Scheduler already running")
        return
    
    scheduler = AsyncIOScheduler()
    
    # Check for notifications every minute
    async def check_notifications_job():
        db = db_session_factory()
        try:
            await check_and_send_notifications(db)
        finally:
            db.close()
    
    scheduler.add_job(
        check_notifications_job,
        trigger=IntervalTrigger(minutes=1),
        id="notification_checker",
        name="Check and send pending notifications",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Notification scheduler started")


def stop_notification_scheduler():
    """Stop the notification scheduler."""
    global scheduler
    
    if scheduler:
        scheduler.shutdown()
        scheduler = None
        logger.info("Notification scheduler stopped")
