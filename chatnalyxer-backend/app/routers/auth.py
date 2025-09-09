from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import schemas, models, utils
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    # Hash the password before saving it to the database
    hashed_password = utils.hash(user_in.password)
    
    # Create the user in the database
    new_user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate and return a token
    token = utils.create_access_token(data={"user_id": new_user.id})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
def login_user(
    credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == credentials.username).first()
    
    # Check if user exists and password is correct
    if not user or not utils.verify(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Generate and return a token
    token = utils.create_access_token(data={"user_id": user.id})
    return {"access_token": token, "token_type": "bearer"}
