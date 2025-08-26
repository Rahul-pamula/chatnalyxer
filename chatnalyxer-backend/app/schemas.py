from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class GroupCreate(BaseModel):
    name: str

class GroupOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str
    group_id: int

class MessageOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    sender_id: int
    group_id: int
    class Config:
        from_attributes = True
