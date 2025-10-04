from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from .. import schemas, models, utils
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])
# Force reload

class UserLogin(BaseModel):
    email: EmailStr
    password: str

@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

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

    # Generate and return a token with user data
    token = utils.create_access_token(data={"sub": new_user.username})
    return {"token": token, "user": new_user}


@router.post("/login", response_model=schemas.AuthResponse)
def login_user(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()

    # Check if user exists and password is correct
    if not user or not utils.verify(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Generate and return a token with user data
    token = utils.create_access_token(data={"sub": user.username})
    return {"token": token, "user": user}
