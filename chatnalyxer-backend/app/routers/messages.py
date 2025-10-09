from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
router = APIRouter(prefix="/messages", tags=["Messages"])

# Enable ML analyzer for priority detection
try:
    from app.services.ml_analyzer import analyzer as ml_analyzer
    print("ML analyzer loaded successfully - priority detection enabled")
except ImportError as e:
    ml_analyzer = None
    print(f"WARNING: ML analyzer import failed: {e} - using fallback values")

# Dependency to check API Key for unauthenticated routes


def get_api_key(x_api_key: str = Header(...)):
    if x_api_key != "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")


@router.post("/from-whatsapp", response_model=schemas.MessageOut, status_code=status.HTTP_201_CREATED)
def create_whatsapp_message(
    payload: schemas.WhatsAppMessageCreate,
    db: Session = Depends(get_db),
    api_key_check: str = Depends(get_api_key)
):
    # Find the group by WhatsApp ID
    group = db.query(models.Group).filter(
        models.Group.whatsapp_id == payload.group_id).first()
    if not group:
        raise HTTPException(
            status_code=404, detail=f"Group with WhatsApp ID {payload.group_id} not found")

    # Create or get default user for WhatsApp messages
    default_user = db.query(models.User).filter(
        models.User.email == "whatsapp@chatnalyxer.com").first()
    if not default_user:
        # Create a default user for WhatsApp messages
        default_user = models.User(
            username="whatsapp_user",
            email="whatsapp@chatnalyxer.com",
            hashed_password="dummy_hash"
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    # Analyze message with ML for priority detection (with fallback)
    if ml_analyzer:
        ml_results = ml_analyzer.analyze_message(
            payload.content, payload.timestamp)
    else:
        # Fallback ML results when analyzer is not available
        ml_results = {
            'priority_level': 'MEDIUM',
            'urgency_score': 0.5,
            'deadline_extracted': None,
            'extracted_keywords': '[]',
            'is_priority': 0,
            'message_category': 'GENERAL',
            'academic_context': '{}'
        }

    msg = models.Message(
        content=payload.content,
        group_id=group.id,
        sender_id=default_user.id,
        created_at=payload.timestamp,
        priority_level=ml_results['priority_level'],
        urgency_score=ml_results['urgency_score'],
        deadline_extracted=ml_results['deadline_extracted'],
        extracted_keywords=ml_results['extracted_keywords'],
        is_priority=ml_results['is_priority'],
        message_category=ml_results.get('message_category', 'GENERAL'),
        academic_context=ml_results.get('academic_context', '{}')
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Log priority message detection
    if ml_results['is_priority']:
        print(
            f"[PRIORITY] MESSAGE detected: {payload.content[:50]}... (Priority: {ml_results['priority_level']}, Score: {ml_results['urgency_score']:.2f})")

    return msg


@router.post("", response_model=schemas.MessageOut)
def create_message(
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    print("📩 New message:", payload.content, "from group:", payload.group_id)
    msg = models.Message(content=payload.content,
                         group_id=payload.group_id, sender_id=user.id)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.get("", response_model=list[schemas.MessageOut])
def list_messages(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    q = db.query(models.Message)
    if group_id:
        q = q.filter(models.Message.group_id == group_id)
    return q.order_by(models.Message.created_at.desc()).limit(100).all()


@router.get("/public", response_model=list[schemas.MessageOut])
def list_messages_public(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Public endpoint for testing - fetches messages without authentication"""
    q = db.query(models.Message)
    if group_id:
        q = q.filter(models.Message.group_id == group_id)
    return q.order_by(models.Message.created_at.desc()).limit(100).all()


@router.get("/priority", response_model=list[schemas.MessageOut])
def list_priority_messages(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Get only priority messages based on ML analysis"""
    q = db.query(models.Message).filter(models.Message.is_priority == 1)
    if group_id:
        q = q.filter(models.Message.group_id == group_id)
    return q.order_by(models.Message.created_at.desc()).limit(100).all()


@router.get("/priority/public", response_model=list[schemas.MessageOut])
def list_priority_messages_public(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Public endpoint for priority messages - for dashboard"""
    q = db.query(models.Message).filter(models.Message.is_priority == 1)
    if group_id:
        q = q.filter(models.Message.group_id == group_id)
    return q.order_by(models.Message.created_at.desc()).limit(100).all()


@router.get("/analytics")
def get_message_analytics(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Get ML analytics data for visualization dashboard"""
    q = db.query(models.Message)
    if group_id:
        q = q.filter(models.Message.group_id == group_id)

    messages = q.all()

    # Convert to dict format for analytics
    message_dicts = []
    for msg in messages:
        message_dicts.append({
            'priority_level': msg.priority_level,
            'urgency_score': msg.urgency_score,
            'deadline_extracted': msg.deadline_extracted,
            'extracted_keywords': msg.extracted_keywords,
            'is_priority': msg.is_priority,
            'message_category': getattr(msg, 'message_category', 'GENERAL'),
            'academic_context': getattr(msg, 'academic_context', '{}')
        })

    if ml_analyzer:
        analytics_data = ml_analyzer.get_analytics_data(message_dicts)
    else:
        # Fallback analytics when ML analyzer is not available
        analytics_data = {
            'total_messages': len(message_dicts),
            'priority_distribution': {'HIGH': 0, 'MEDIUM': len(message_dicts), 'LOW': 0},
            'urgency_score_avg': 0.5,
            'messages_with_deadlines': 0,
            'top_keywords': []
        }
    return analytics_data


@router.delete("/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Delete a message by ID"""
    message = db.query(models.Message).filter(
        models.Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Optional: Check if user owns the message or is admin
    # For now, allow any authenticated user to delete

    db.delete(message)
    db.commit()
    return {"message": "Message deleted successfully"}


@router.delete("")
def delete_all_messages(
    db: Session = Depends(get_db)
):
    """Delete all messages"""
    print("Deleting all messages")
    db.query(models.Message).delete()
    db.commit()
    print("All messages deleted")
    return {"message": "All messages deleted successfully"}


@router.get("/analytics/public")
def get_message_analytics_public(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Public endpoint for analytics data - for dashboard"""
    q = db.query(models.Message)
    if group_id:
        q = q.filter(models.Message.group_id == group_id)

    messages = q.all()

    # Convert to dict format for analytics
    message_dicts = []
    for msg in messages:
        message_dicts.append({
            'priority_level': msg.priority_level,
            'urgency_score': msg.urgency_score,
            'deadline_extracted': msg.deadline_extracted,
            'extracted_keywords': msg.extracted_keywords,
            'is_priority': msg.is_priority,
            'message_category': getattr(msg, 'message_category', 'GENERAL'),
            'academic_context': getattr(msg, 'academic_context', '{}')
        })

    if ml_analyzer:
        analytics_data = ml_analyzer.get_analytics_data(message_dicts)
    else:
        # Fallback analytics when ML analyzer is not available
        analytics_data = {
            'total_messages': len(message_dicts),
            'priority_distribution': {'HIGH': 0, 'MEDIUM': len(message_dicts), 'LOW': 0},
            'urgency_score_avg': 0.5,
            'messages_with_deadlines': 0,
            'top_keywords': []
        }
    return analytics_data
