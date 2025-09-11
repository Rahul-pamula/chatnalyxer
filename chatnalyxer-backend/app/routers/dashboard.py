from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import schemas, models
from ..database import get_db
from ..deps import get_current_user
from typing import List

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/", response_model=schemas.DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    # This is a temporary placeholder. Rahul will need to find the correct
    # messages from the database for the authenticated user.
    # For now, let's just get the latest 50 messages from the database
    messages = db.query(models.Message).order_by(models.Message.created_at.desc()).limit(50).all()
    
    return {
        "messages": messages
    }