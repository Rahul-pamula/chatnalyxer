"""
Push Notification Service
Handles sending push notifications via Expo Push API
"""

import requests
import logging
from datetime import datetime
from typing import Dict, Optional
from sqlalchemy.orm import Session

from ..models import User, Notification

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push_notification(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    data: Optional[Dict] = None,
    priority: str = "HIGH"
) -> bool:
    """
    Send push notification to user via Expo Push API
    
    Args:
        db: Database session
        user_id: User ID to send notification to
        title: Notification title
        body: Notification body
        data: Additional data to send with notification
        priority: Notification priority (HIGH, MEDIUM, CRITICAL)
    
    Returns:
        bool: True if notification sent successfully
    """
    try:
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            logger.error(f"User {user_id} not found")
            return False
        
        # Check if user has push token and notifications enabled
        if not user.push_token:
            logger.warning(f"User {user_id} has no push token")
            return False
        
        if not user.notifications_enabled:
            logger.info(f"Notifications disabled for user {user_id}")
            return False
        
        # Prepare notification payload
        message = {
            "to": user.push_token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
            "priority": "high",
            "channelId": priority,  # Android notification channel
        }
        
        # Send to Expo Push API (Expo expects an array of messages)
        logger.info(f"Sending push notification to user {user_id}: {title}")
        payload = [message]  # Expo API requires array format
        
        # Using requests to remove httpx dependency
        # Since this is async, ideally we'd use aiohttp, but requests works for now
        response = requests.post(
            EXPO_PUSH_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=10
        )
        
        # Check response
        if response.status_code == 200:
            result = response.json()
            
            # Expo returns an array of tickets
            if result and isinstance(result, list) and len(result) > 0:
                ticket = result[0]
                if ticket.get("status") == "error":
                    logger.error(f"Expo Push error: {ticket.get('message')}")
                    return False
            
            # Save notification to database
            notification = Notification(
                user_id=user_id,
                related_message_id=data.get("messageId") if data else None,
                title=title,
                message=body,
                priority=priority,
                is_sent=True,
                sent_at=datetime.now(),
                notification_type="push"
            )
            db.add(notification)
            db.commit()
            
            logger.info(f"✅ Push notification sent successfully to user {user_id}")
            return True
        else:
            logger.error(f"Failed to send push notification: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
        return False


async def send_batch_notifications(
    db: Session,
    notifications: list
) -> Dict[str, int]:
    """
    Send multiple push notifications in batch
    
    Args:
        db: Database session
        notifications: List of notification dicts with user_id, title, body, data
    
    Returns:
        Dict with success and failure counts
    """
    results = {"success": 0, "failed": 0}
    
    for notif in notifications:
        success = await send_push_notification(
            db=db,
            user_id=notif["user_id"],
            title=notif["title"],
            body=notif["body"],
            data=notif.get("data"),
            priority=notif.get("priority", "HIGH")
        )
        
        if success:
            results["success"] += 1
        else:
            results["failed"] += 1
    
    logger.info(f"Batch notifications sent: {results['success']} success, {results['failed']} failed")
    return results
