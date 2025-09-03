from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
<<<<<<< HEAD
from jose import JWTError, jwt
=======
from jose import jwt, JWTError
>>>>>>> feature/backend-auth
from passlib.context import CryptContext

from .. import models, schemas
from ..database import get_db

<<<<<<< HEAD
# -----------------------
# JWT / Auth Config
# -----------------------
SECRET_KEY = "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4"  # ⚠️ move to .env
=======
SECRET_KEY = "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4"  # move to .env
>>>>>>> feature/backend-auth
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

router = APIRouter(prefix="/auth", tags=["Auth"])

<<<<<<< HEAD

# -----------------------
# Password Helpers
# -----------------------
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)


# -----------------------
# Authenticate User
# -----------------------
=======
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

>>>>>>> feature/backend-auth
def authenticate_user(db: Session, username: str, password: str):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

<<<<<<< HEAD

# -----------------------
# JWT Helpers
# -----------------------
def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT token with `sub=username`"""
=======
def create_access_token(data: dict, expires_delta: timedelta | None = None):
>>>>>>> feature/backend-auth
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

<<<<<<< HEAD

# -----------------------
# Routes
# -----------------------
=======
>>>>>>> feature/backend-auth
@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
<<<<<<< HEAD

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)

    return {"access_token": token, "token_type": "bearer"}


# -----------------------
# Get Current User
# -----------------------
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(models.User).filter(models.User.username == username).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
=======
    token = create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

# keep get_current_user in deps.py (see next)
>>>>>>> feature/backend-auth
