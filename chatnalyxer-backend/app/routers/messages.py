from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/messages", tags=["Messages"])

# This is the existing endpoint for the mobile app, which requires a logged-in user.
@router.post("", response_model=schemas.MessageOut)
def create_message(
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    print("📩 New message:", payload.content, "from group:", payload.group_id)
    msg = models.Message(content=payload.content, group_id=payload.group_id, sender_id=user.id)
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

# --- NEW ENDPOINT FOR WHATSAPP SCRIPT ---

# Dependency to check the API Key for unauthenticated routes.
def get_api_key(x_api_key: str = Header(...)):
    # This key should be stored securely, e.g., in a .env file.
    if x_api_key != "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")

@router.post("/from-whatsapp", status_code=status.HTTP_201_CREATED)
def create_whatsapp_message(
    payload: schemas.WhatsAppMessageCreate,
    db: Session = Depends(get_db),
    api_key_check: str = Depends(get_api_key)
):
    # This is a temporary placeholder. Rahul will need to find the correct
    # sender_id and group_id from the database using the names/IDs.
    # For now, let's assume a default user (ID 1) and group (ID 1).
    sender_id = 1
    
    # In the future, Rahul needs to find the group from the database
    # using payload.group_id (which is a string like "123456@g.us")
    # and get the integer ID.
    group_id = 1 # Temporary placeholder

    msg = models.Message(
        content=payload.content,
        group_id=group_id,
        sender_id=sender_id,
        created_at=payload.timestamp
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"status": "success", "message": "Message received and stored"}