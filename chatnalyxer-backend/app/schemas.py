from pydantic import BaseModel, EmailStr, model_validator
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
    password: str
    email: Optional[EmailStr] = None


class UserLogin(UserBase):
    pass  # Only phone_number needed for OTP login


class UserOut(BaseModel):
    id: int
    username: str
    phone_number: Optional[str] = None
    is_verified: bool
    email: Optional[EmailStr] = None
    user_type: str = "CASUAL"
    profile_data: Optional[Dict[str, Any]] = {}
    is_profile_complete: bool = False  # New field to track onboarding status

    @classmethod
    def from_orm(cls, obj):
        # Populate user_type and profile_data from user_profile relationship
        data = {
            "id": obj.id,
            "username": obj.username,
            "phone_number": obj.phone_number,
            "is_verified": bool(obj.is_verified),
            "email": obj.email,
            "user_type": "CASUAL",
            "profile_data": {},
            "is_profile_complete": False
        }
        
        # Get data from user_profile relationship if it exists
        if hasattr(obj, 'user_profile') and obj.user_profile:
            data["user_type"] = obj.user_profile.user_type or "CASUAL"
            data["profile_data"] = obj.user_profile.profile_data or {}
            data["is_profile_complete"] = True  # Profile exists, so it's complete
        
        return cls(**data)

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    user_type: Optional[str] = None
    profile_data: Optional[Dict[str, Any]] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None


# ----- Push Notifications -----

class PushTokenRequest(BaseModel):
    push_token: str


# ----- OTP Authentication -----


class OTPRequest(BaseModel):
    username: str
    phone_number: str

class UserRegisterRequest(OTPRequest):
    password: str
    email: Optional[EmailStr] = None
    
    @model_validator(mode='before')
    @classmethod
    def empty_str_to_none(cls, values):
        """Convert empty email string to None before validation"""
        if isinstance(values, dict) and 'email' in values:
            email = values.get('email')
            if isinstance(email, str) and not email.strip():
                values['email'] = None
        return values

class UserLoginRequest(BaseModel):
    phone_number: str
    password: str

class OTPVerify(BaseModel):
    phone_number: str
    otp_code: str

class PasswordReset(BaseModel):
    phone_number: str
    otp_code: str
    new_password: str

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
    
    # RAG Fields
    media_url: Optional[str] = None
    media_type: Optional[str] = "text"
    extracted_text: Optional[str] = None
    
    # Feedback
    is_manual_override: bool = False

    # Soft delete field
    deleted_at: Optional[datetime] = None
    
    # Display fields for mobile app
    group_name: Optional[str] = None
    sender_name: Optional[str] = None

    class Config:
        from_attributes = True

# ----- Message from WhatsApp Integration -----


class WhatsAppMessageCreate(BaseModel):
    user_id: int  # NEW: Required user ID
    content: str
    sender_name: str
    group_id: str  # WhatsApp group ID (e.g., "123456789@g.us")
    timestamp: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = "text"
    extracted_content: Optional[str] = None  # NEW: Text extracted from PDF/image via Azure AI

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
