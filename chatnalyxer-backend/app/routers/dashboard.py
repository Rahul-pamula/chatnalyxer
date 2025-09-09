from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import schemas
from ..database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=schemas.DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    return {
        "messages": [
            {"id": 1, "sender": "Prof. Sharma", "text": "Exam postponed to next week.", "date": "2025-09-01T10:30:00Z"},
            {"id": 2, "sender": "Dept Admin", "text": "Cultural fest on Friday!", "date": "2025-08-31T14:45:00Z"},
        ]
    }
