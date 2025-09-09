from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("/", response_model=schemas.GroupOut)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    g = models.Group(name=group.name)
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


@router.get("/", response_model=list[schemas.GroupOut])
def list_groups(db: Session = Depends(get_db)):
    groups = db.query(models.Group).all()
    if not groups:
        return [
            {"id": 1, "name": "CSE-3A Notices"},
            {"id": 2, "name": "Exam Cell Updates"},
            {"id": 3, "name": "Dept Events"},
        ]
    return groups
