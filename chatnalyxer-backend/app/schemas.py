from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# ----- Token -----


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    token: str
    user: 'UserOut'

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
    whatsapp_id: Optional[str] = None


class GroupUpdate(BaseModel):
    is_selected: bool


class GroupOut(BaseModel):
    id: int
    name: str
    whatsapp_id: Optional[str] = None
    is_selected: bool
    created_at: datetime

    class Config:
        orm_mode = True

# ----- WhatsApp Group Sync -----


class WhatsAppGroupSync(BaseModel):
    groups: List[dict]  # List of {whatsapp_id, name} from WhatsApp

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
    # ML-based priority detection fields
    priority_level: Optional[str] = "MEDIUM"
    urgency_score: Optional[float] = 0.5
    deadline_extracted: Optional[datetime] = None
    extracted_keywords: Optional[str] = None
    is_priority: Optional[int] = 0
    # Soft delete field
    deleted_at: Optional[datetime] = None

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
