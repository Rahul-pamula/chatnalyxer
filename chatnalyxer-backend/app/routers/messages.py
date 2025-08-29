from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/messages", tags=["Messages"])


# ✅ Create a new message
@router.post("/", response_model=schemas.MessageOut)
def create_message(
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    msg = models.Message(
        content=payload.content,
        group_id=payload.group_id,
        sender_id=user.id
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


# ✅ Get messages (optionally filter by group_id)
@router.get("/", response_model=list[schemas.MessageOut])
def list_messages(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    query = db.query(models.Message)

    if group_id:
        query = query.filter(models.Message.group_id == group_id)

    return query.order_by(models.Message.created_at.desc()).limit(100).all()
