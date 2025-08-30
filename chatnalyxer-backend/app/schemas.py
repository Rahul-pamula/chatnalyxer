from pydantic import BaseModel, EmailStr
from datetime import datetime

from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str
# ----- User -----
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        orm_mode = True   # for SQLAlchemy models


# ----- Auth -----
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ----- Group -----
class GroupCreate(BaseModel):
    name: str


class GroupOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


# ----- Message -----
class MessageCreate(BaseModel):
    content: str
    group_id: int


class MessageOut(BaseModel):
    id: int
    content: str
    group_id: int
    sender_id: int
    created_at: datetime

    class Config:
        orm_mode = True
