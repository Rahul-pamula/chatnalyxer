from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user

router = APIRouter(prefix="/groups", tags=["Groups"])

@router.post("/", response_model=schemas.GroupOut)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    g = models.Group(name=group.name)
    db.add(g); db.commit(); db.refresh(g)
    return g

@router.get("/", response_model=list[schemas.GroupOut])
def list_groups(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return db.query(models.Group).all()
