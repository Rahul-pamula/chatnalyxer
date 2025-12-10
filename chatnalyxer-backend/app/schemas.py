from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Any, Dict

# ----- Token -----


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    token: str
    user: 'UserOut'

# ----- User -----


class UserBase(BaseModel):
    phone_number: str


class UserCreate(UserBase):
    username: str


class UserLogin(UserBase):
    pass  # Only phone_number needed for OTP login


class UserOut(BaseModel):
    id: int
    username: str
    phone_number: Optional[str] = None
    is_verified: bool
    email: Optional[EmailStr] = None

    class Config:
        from_attributes = True


# ----- OTP Authentication -----


class OTPRequest(BaseModel):
    username: str
    phone_number: str


class OTPVerify(BaseModel):
    phone_number: str
    otp_code: str

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
        from_attributes = True

# ----- WhatsApp Group Sync -----


class WhatsAppGroupSync(BaseModel):
    user_id: int  # User ID to associate groups with
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
        from_attributes = True

# ----- Message from WhatsApp Integration -----


class WhatsAppMessageCreate(BaseModel):
    content: str
    sender_name: str
    group_id: str
    timestamp: datetime

# ----- Dashboard Response -----


class DashboardResponse(BaseModel):
    messages: List[MessageOut]

# ----- AI Integration Schemas -----

class AIAnalysisRequest(BaseModel):
    content: str
    sender: str
    group: str
    type: str = "text" # text, image, pdf, voice

class AITaskBase(BaseModel):
    task_description: str
    priority: Optional[str] = "medium"
    deadline: Optional[datetime] = None
    status: Optional[str] = "pending"

class AITaskCreate(AITaskBase):
    pass

class AITaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None

class AITaskOut(AITaskBase):
    id: int
    source_message_id: Optional[int] = None
    created_by_ai: bool
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AnalyzedMessageOut(BaseModel):
    id: int
    group_name: Optional[str]
    sender_name: Optional[str]
    message_type: str
    original_content: str
    ai_summary: Optional[str]
    priority: Optional[str]
    category: Optional[str]
    action_items: List[str] = []
    deadline: Optional[datetime]
    is_important: bool
    created_at: datetime
    generated_tasks: List[AITaskOut] = []

    class Config:
        from_attributes = True

class AIChatRequest(BaseModel):
    message: str

class AIChatResponse(BaseModel):
    response: str
