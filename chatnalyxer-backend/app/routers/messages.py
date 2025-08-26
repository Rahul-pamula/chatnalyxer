from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user

router = APIRouter(prefix="/messages", tags=["Messages"])

@router.post("/", response_model=schemas.MessageOut)
def create_message(payload: schemas.MessageCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    msg = models.Message(content=payload.content, group_id=payload.group_id, sender_id=user.id)
    db.add(msg); db.commit(); db.refresh(msg)
    return msg

@router.get("/", response_model=list[schemas.MessageOut])
def list_messages(group_id: int | None = None, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    q = db.query(models.Message)
    if group_id:
        q = q.filter(models.Message.group_id == group_id)
    return q.order_by(models.Message.created_at.desc()).limit(100).all()
