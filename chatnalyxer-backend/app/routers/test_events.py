"""
Simple text-based event creation endpoint for testing
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import User, Event
from app.deps import get_current_user
from app.services.deadline_extractor import DeadlineExtractor
from app.services.reminder_scheduler import ReminderScheduler
from app.services.message_personalizer import MessagePersonalizer
from app.services.push_service import send_push_notification

router = APIRouter(prefix="/test", tags=["test"])


class TextEventRequest(BaseModel):
    text: str


@router.post("/create-event-from-text")
async def create_event_from_text(
    request: TextEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test endpoint: Create event from text (no voice needed)
    
    Example: POST /test/create-event-from-text
    Body: {"text": "exam tomorrow at 10 AM"}
    """
    try:
        print(f"📝 Received text: {request.text}")
        
        # Extract deadline using AI
        deadline_info = DeadlineExtractor.extract_deadline(
            message_text=request.text,
            current_date=datetime.now()
        )
        
        print(f"🤖 AI Result: {deadline_info}")
        
        if not deadline_info.get('has_deadline'):
            return {
                "success": False,
                "text": request.text,
                "deadline_info": deadline_info,
                "error": "Could not detect a deadline. Try: 'exam tomorrow at 10 AM'"
            }
        
        # Create event
        event_datetime = DeadlineExtractor.combine_datetime(
            date_str=deadline_info['deadline_date'],
            time_str=deadline_info.get('deadline_time'),
            event_type=deadline_info.get('event_type', 'event')
        )
        
        event = Event(
            user_id=current_user.id,
            title=deadline_info.get('subject', 'Test Event'),
            description=f"Created from text: {request.text}",
            event_date=event_datetime.date(),
            event_time=event_datetime.time(),
            event_type=deadline_info.get('event_type'),
            source='text_test'
        )
        
        db.add(event)
        db.commit()
        db.refresh(event)
        
        print(f"✅ Event created: {event.title}")
        
        # Schedule reminders
        reminders_scheduled = await ReminderScheduler.schedule_reminders(
            db=db,
            event=event,
            user=current_user
        )
        
        return {
            "success": True,
            "text": request.text,
            "event": {
                "id": event.id,
                "title": event.title,
                "date": event.event_date.isoformat(),
                "time": event.event_time.isoformat(),
                "type": event.event_type
            },
            "deadline_info": deadline_info,
            "reminders_scheduled": reminders_scheduled
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
