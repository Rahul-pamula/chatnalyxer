from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional

# ----- User -----
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True

# ----- Auth -----
class TokenResponse(BaseModel):
    user: UserOut
    token: str

# ----- Group -----
class GroupCreate(BaseModel):
    name: str

class GroupOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

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
        from_attributes = True

# ----- WhatsApp Integration -----
class WhatsAppMessageCreate(BaseModel):
    content: str
    sender_name: str
    group_id: str
    timestamp: datetime

# ----- Dashboard -----
class DashboardMessage(BaseModel):
    id: int
    sender: str
    text: str
    date: str

class DashboardResponse(BaseModel):
    messages: List[DashboardMessage]
