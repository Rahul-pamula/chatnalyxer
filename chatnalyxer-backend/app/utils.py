from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT secret key and algorithm
SECRET_KEY = "YOUR_SUPER_SECRET_KEY" # CHANGE THIS IN PRODUCTION
ALGORITHM = "HS256"

def hash(password: str):
    """Hashes a password using bcrypt."""
    return pwd_context.hash(password)

def verify(plain_password: str, hashed_password: str):
    """Verifies a plain-text password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a new JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
