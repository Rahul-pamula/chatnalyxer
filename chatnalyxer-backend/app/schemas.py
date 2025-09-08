from pydantic import BaseModel, EmailStr
from datetime import datetime

# ----- Token -----
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

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

    class Config:
        orm_mode = True
        
# ----- Message from WhatsApp Integration -----
class WhatsAppMessageCreate(BaseModel):
    content: str
    sender_name: str
    group_id: str
    timestamp: datetime