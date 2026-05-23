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
    """
    Get all important messages from user's selected groups
    Shows messages that passed the keyword filtering (casual messages were skipped)
    """
    # Get user's selected groups
    selected_groups = db.query(models.Group).join(models.GroupMember).filter(
        models.GroupMember.user_id == user.id,
        models.Group.is_selected == 1
    ).all()
    
    # Get all selected group IDs
    selected_group_ids = [group.id for group in selected_groups]
    
    # Get messages from selected groups only (these are already filtered as important)
    if selected_group_ids:
        messages = db.query(models.Message).filter(
            models.Message.group_id.in_(selected_group_ids),
            models.Message.deleted_at.is_(None)
        ).order_by(models.Message.created_at.desc()).limit(100).all()
    else:
        # No groups selected, return empty list
        messages = []
    
    return {
        "messages": messages
    }