from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from .. import models
from ..deps import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class PushTokenUpdate(BaseModel):
    push_token: str

@router.post("/register")
async def register_push_token(
    token_data: PushTokenUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Register or update user's Expo push token for notifications.
    """
    try:
        current_user.push_token = token_data.push_token
        current_user.notifications_enabled = True  # Enable notifications
        db.commit()
        logger.info(f"Updated push token for user {current_user.id}")
        
        return {
            "success": True,
            "message": "Push token registered successfully"
        }
    except Exception as e:
        logger.error(f"Failed to register push token: {e}")
        raise HTTPException(status_code=500, detail="Failed to register push token")


@router.get("/")
async def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    limit: int = 50
):
    """
    Get user's notifications (sent and pending).
    """
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).limit(limit).all()
    
    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "priority": n.priority,
                "is_read": n.is_read,
                "read_at": n.read_at.isoformat() if n.read_at else None,
                "scheduled_time": n.scheduled_time.isoformat() if n.scheduled_time else None,
                "is_sent": n.is_sent,
                "sent_at": n.sent_at.isoformat() if n.sent_at else None,
                "type": n.notification_type,
                "event_id": n.related_event_id
            }
            for n in notifications
        ]
    }


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Cancel/delete a notification.
    """
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"success": True, "message": "Notification deleted"}
