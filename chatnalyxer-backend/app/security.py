import os
from datetime import datetime, timedelta, timezone
from jose import jwt

SECRET_KEY = os.getenv("b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4", "change_me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

def create_access_token(subject: str, minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes or ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
