from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# ----- Token -----
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ----- User -----
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    username: str
    password: str

class UserLogin(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    username: str

    class Config:
        orm_mode = True

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
    sender: UserOut

    class Config:
        orm_mode = True

# ----- Message from WhatsApp Integration -----
class WhatsAppMessageCreate(BaseModel):
    content: str
    sender_name: str
    group_id: str
    timestamp: datetime

# ----- Dashboard Response -----
class DashboardResponse(BaseModel):
    messages: List[MessageOut]
