from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..utils import hash_password, verify_password
from ..security import create_access_token

router = APIRouter(tags=["Users"])

@router.post("/users", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    exists = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    new_user = models.User(username=user.username, email=user.email, hashed_password=hash_password(user.password))
    db.add(new_user); db.commit(); db.refresh(new_user)
    return new_user

@router.post("/auth/token", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # form.username can be email or username
    user = db.query(models.User).filter(
        (models.User.email == form.username) | (models.User.username == form.username)
    ).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username/email or password")
    token = create_access_token(subject=user.email)
    return {"access_token": token, "token_type": "bearer"}
