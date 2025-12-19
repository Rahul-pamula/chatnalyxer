from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..utils import hash_password, verify_password
from ..security import create_access_token
from ..deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    exists = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    new_user = models.User(
        username=user.username, 
        email=user.email, 
        hashed_password=hash_password(user.password),
        phone_number=user.phone_number
    )
    db.add(new_user); db.commit(); db.refresh(new_user)
    return new_user

@router.post("/token", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # form.username can be email or username
    user = db.query(models.User).filter(
        (models.User.email == form.username) | (models.User.username == form.username)
    ).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username/email or password")
    token = create_access_token(subject=user.username)
    return {"access_token": token, "token_type": "bearer"}

@router.get("/profile", response_model=schemas.UserOut)
def get_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Ensure user_profile relationship is loaded
    if not current_user.user_profile:
        db.refresh(current_user, attribute_names=["user_profile"])
        
    return schemas.UserOut.from_orm(current_user)


@router.put("/profile", response_model=schemas.UserOut)
def update_profile(
    profile_update: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Get or create user profile
    user_profile = db.query(models.UserProfile).filter(
        models.UserProfile.user_id == current_user.id
    ).first()
    
    if not user_profile:
        # Create new profile
        user_profile = models.UserProfile(user_id=current_user.id)
        db.add(user_profile)
    
    # Update profile fields
    if profile_update.user_type:
        user_profile.user_type = profile_update.user_type
        current_user.user_type = profile_update.user_type  # Sync with User table
    
    if profile_update.profile_data is not None:
        user_profile.profile_data = profile_update.profile_data
        current_user.profile_data = profile_update.profile_data  # Sync with User table
    
    # Update user fields if provided
    if profile_update.username:
        if profile_update.username != current_user.username:
            exists = db.query(models.User).filter(models.User.username == profile_update.username).first()
            if exists:
                raise HTTPException(status_code=400, detail="Username already exists")
            current_user.username = profile_update.username

    if profile_update.email:
        if profile_update.email != current_user.email:
             exists = db.query(models.User).filter(models.User.email == profile_update.email).first()
             if exists:
                 raise HTTPException(status_code=400, detail="Email already exists")
             current_user.email = profile_update.email

    db.commit()
    db.refresh(current_user)
    
    # Explicitly ensure user_profile is loaded for the response model
    if not current_user.user_profile:
        db.refresh(current_user, attribute_names=["user_profile"])
        
    return schemas.UserOut.from_orm(current_user)
