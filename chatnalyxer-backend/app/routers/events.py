from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time, datetime
from ..database import get_db
from .. import models
from ..deps import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Events"])

# New endpoint for auto-created scheduled events from deadlines
@router.get("/scheduled")
async def get_scheduled_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get scheduled events auto-created from message deadlines.
    """
    try:
        logger.info(f"📅 Fetching scheduled events for user: {current_user.username} (ID: {current_user.id})")
        
        events = db.query(models.ScheduledEvent).filter(
            models.ScheduledEvent.user_id == current_user.id,
            models.ScheduledEvent.is_completed == False
        ).order_by(models.ScheduledEvent.deadline.asc()).all()
        
        logger.info(f"✅ Found {len(events)} scheduled events for user {current_user.username}")
        
        return {
            "events": [
                {
                    "id": e.id,
                    "title": e.title,
                    "description": e.description,
                    "deadline": e.deadline.isoformat() if e.deadline else None,
                    "message_id": e.message_id,
                    "is_completed": e.is_completed,
                    "created_at": e.created_at.isoformat() if e.created_at else None
                }
                for e in events
            ]
        }
    except Exception as e:
        logger.error(f"❌ Error fetching scheduled events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch events: {str(e)}")

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str  # YYYY-MM-DD format
    event_time: Optional[str] = None  # HH:MM format
    location: Optional[str] = None
    reminder_minutes: int = 30
    is_all_day: bool = False
    is_alarm: bool = False  # NEW: Flag for alarm mode

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    location: Optional[str] = None
    reminder_minutes: Optional[int] = None
    is_all_day: Optional[bool] = None

@router.get("/")
async def get_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get user's events, optionally filtered by date range.
    """
    query = db.query(models.Event).filter(
        models.Event.user_id == current_user.id
    )
    
    if start_date:
        query = query.filter(models.Event.event_date >= start_date)
    if end_date:
        query = query.filter(models.Event.event_date <= end_date)
    
    events = query.order_by(models.Event.event_date, models.Event.event_time).all()
    
    return {
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "description": e.description,
                "event_date": str(e.event_date),
                "event_time": str(e.event_time) if e.event_time else None,
                "location": e.location,
                "reminder_minutes": e.reminder_minutes,
                "is_all_day": e.is_all_day,
                "source": e.source,
                "source_message_id": e.source_message_id,
                "created_at": e.created_at.isoformat()
            }
            for e in events
        ]
    }

@router.get("/upcoming")
async def get_upcoming_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    limit: int = 10
):
    """
    Get upcoming events (from today onwards).
    """
    today = date.today()
    
    events = db.query(models.Event).filter(
        models.Event.user_id == current_user.id,
        models.Event.event_date >= today
    ).order_by(models.Event.event_date, models.Event.event_time).limit(limit).all()
    
    return {
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "description": e.description,
                "event_date": str(e.event_date),
                "event_time": str(e.event_time) if e.event_time else None,
                "location": e.location,
                "source": e.source
            }
            for e in events
        ]
    }

@router.post("/")
async def create_event(
    event_data: EventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new event manually.
    """
    try:
        event = models.Event(
            user_id=current_user.id,
            title=event_data.title,
            description=event_data.description,
            event_date=datetime.strptime(event_data.event_date, '%Y-%m-%d').date(),
            event_time=datetime.strptime(event_data.event_time, '%H:%M').time() if event_data.event_time else None,
            location=event_data.location,
            reminder_minutes=event_data.reminder_minutes,
            is_all_day=event_data.is_all_day,
            source='manual'
        )
        
        db.add(event)
        db.commit()
        db.refresh(event)
        
        # Create notification based on mode (Alarm vs Reminder)
        try:
            from datetime import timedelta
            
            # Build the datetime for the event
            event_datetime = datetime.combine(event.event_date, event.event_time or time(0, 0))
            
            if event_data.is_alarm:
                # ALARM MODE: Notification at exact time
                notification_time = event_datetime
                notif_type = "alarm"
                priority = "CRITICAL"
                title = f"⏰ Alarm: {event.title}"
                logger.info(f"Creating alarm notification at exact time: {notification_time}")
            else:
                # REMINDER MODE: Notification 30 mins before (or custom)
                notification_time = event_datetime - timedelta(minutes=event_data.reminder_minutes)
                notif_type = "event_reminder"
                priority = "HIGH"
                title = f"📅 Reminder: {event.title}"
                logger.info(f"Creating reminder notification {event_data.reminder_minutes} mins before: {notification_time}")
            
            # Don't schedule notifications in the past
            now = datetime.now()
            if notification_time < now:
                logger.warning(f"Notification time {notification_time} is in the past, scheduling for immediate delivery")
                notification_time = now + timedelta(seconds=5)
            
            # Create the notification
            new_notification = models.Notification(
                user_id=current_user.id,
                title=title,
                message=event.description or event.title,
                scheduled_time=notification_time,
                notification_type=notif_type,
                related_event_id=event.id,
                priority=priority,
                is_read=False,
                is_sent=False
            )
            db.add(new_notification)
            db.commit()
            logger.info(f"✅ Notification created successfully (ID: {new_notification.id})")
            
        except ImportError:
            logger.warning("Notification service not available (missing dependencies?)")
        except Exception as ex:
            logger.error(f"Failed to create notification: {ex}")
            import traceback
            traceback.print_exc()
        
        return {
            "success": True,
            "event": {
                "id": event.id,
                "title": event.title,
                "event_date": str(event.event_date)
            }
        }
    except Exception as e:
        logger.error(f"Failed to create event: {e}")
        raise HTTPException(status_code=500, detail="Failed to create event")

@router.put("/{event_id}")
async def update_event(
    event_id: int,
    event_data: EventUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update an existing event.
    """
    event = db.query(models.Event).filter(
        models.Event.id == event_id,
        models.Event.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event_data.title:
        event.title = event_data.title
    if event_data.description is not None:
        event.description = event_data.description
    if event_data.event_date:
        event.event_date = datetime.strptime(event_data.event_date, '%Y-%m-%d').date()
    if event_data.event_time is not None:
        event.event_time = datetime.strptime(event_data.event_time, '%H:%M').time() if event_data.event_time else None
    if event_data.location is not None:
        event.location = event_data.location
    if event_data.reminder_minutes is not None:
        event.reminder_minutes = event_data.reminder_minutes
    if event_data.is_all_day is not None:
        event.is_all_day = event_data.is_all_day
    
    db.commit()
    
    return {"success": True, "message": "Event updated"}

@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete an event (Manual or AI/Scheduled).
    """
    # 1. Try to find in manual events
    event = db.query(models.Event).filter(
        models.Event.id == event_id,
        models.Event.user_id == current_user.id
    ).first()
    
    if event:
        db.delete(event)
        db.commit()
        return {"success": True, "message": "Event deleted"}

    # 2. If not found, try to find in scheduled events (AI created)
    scheduled_event = db.query(models.ScheduledEvent).filter(
        models.ScheduledEvent.id == event_id,
        models.ScheduledEvent.user_id == current_user.id
    ).first()

    if scheduled_event:
        db.delete(scheduled_event)
        db.commit()
        return {"success": True, "message": "Scheduled event deleted"}

    # 3. If neither found
    raise HTTPException(status_code=404, detail="Event not found")
