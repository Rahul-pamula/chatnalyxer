from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, func, Boolean, Date, Time
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from .database import Base
from sqlalchemy.sql import func
from datetime import datetime, timedelta


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    is_verified = Column(Integer, default=0, nullable=False)  # 0=not verified, 1=verified
    
    # Multi-Persona Fields
    user_type = Column(String(50), default="CASUAL", nullable=False) # STUDENT, FACULTY, CASUAL
    profile_data = Column(JSONB, default={}, nullable=True) # Dynamic profile details
    
    # Push Notifications
    push_token = Column(String(255), nullable=True) # Expo push token
    notifications_enabled = Column(Boolean, default=True, nullable=False) # User can disable notifications
    
    # WhatsApp Session Tracking
    whatsapp_connected = Column(Boolean, default=False, nullable=False)
    whatsapp_session_port = Column(Integer, nullable=True)
    whatsapp_last_connected = Column(DateTime(timezone=True), nullable=True)
    whatsapp_qr_code = Column(Text, nullable=True)
    whatsapp_pairing_code = Column(String(8), nullable=True)

    # relationship - specify foreign_keys to avoid ambiguity with receiver_user_id
    messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    groups = relationship("GroupMember", back_populates="user")
    
    # AI relationships
    context = relationship("UserContext", back_populates="user", uselist=False)
    analyzed_messages = relationship("AnalyzedMessage", back_populates="user")
    ai_tasks = relationship("AITask", back_populates="user")
    ai_conversations = relationship("AIConversation", back_populates="user")
    email_credentials = relationship("EmailCredential", back_populates="user")
    user_profile = relationship("UserProfile", back_populates="user", uselist=False)
    events = relationship("Event", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    interactions = relationship("UserInteraction", back_populates="user")



class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_type = Column(String(50), default="CASUAL", nullable=False)
    profile_data = Column(JSONB, default={}, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="user_profile")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(Date, nullable=False)
    event_time = Column(Time, nullable=True)
    location = Column(String(255), nullable=True)
    reminder_minutes = Column(Integer, default=30)
    is_all_day = Column(Boolean, default=False)
    source = Column(String(50), default="manual")  # 'manual', 'ai_detected', 'whatsapp'
    source_message_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="events")
    source_message = relationship("Message", foreign_keys=[source_message_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Notification metadata
    priority = Column(String(20))  # HIGH, MEDIUM, CRITICAL
    notification_type = Column(String(50), default="reminder")
    
    # Scheduling
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Read status
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Related entities
    related_event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=True)
    related_message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=True)
    expo_push_token = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications")
    related_event = relationship("Event", foreign_keys=[related_event_id])
    related_message = relationship("Message", foreign_keys=[related_message_id])


class UserInteraction(Base):
    """
    Track user interactions for behavior analysis and personalization
    """
    __tablename__ = "user_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    interaction_type = Column(String(50), nullable=False)  # notification_opened, time_confirmed, app_opened, etc.
    interaction_data = Column(JSONB, default={})  # Additional context
    
    # Related entities
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="SET NULL"), nullable=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="interactions")



class EmailCredential(Base):
    __tablename__ = "email_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    email_address = Column(String(255), nullable=False)
    # In production, use Fernet/AES encryption. For MVP/Imagine Cup, simple storage or basic encoding is acceptable if noted.
    # We will assume app_password is stored here.
    app_password = Column(String(255), nullable=False)
    provider = Column(String(50), default="gmail") # gmail, outlook
    is_active = Column(Boolean, default=True)
    last_synced = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="email_credentials")


class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(20), index=True, nullable=False)
    otp_code = Column(String(6), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Integer, default=0, nullable=False)  # 0=not used, 1=used
    attempts = Column(Integer, default=0, nullable=False)


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    whatsapp_id = Column(String(255), unique=True, nullable=False)
    # 0=not selected, 1=selected
    is_selected = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)  # Track if group still exists in WhatsApp
    
    # Direct ownership link (Added per feature request)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationship
    messages = relationship("Message", back_populates="group")
    members = relationship("GroupMember", back_populates="group")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="groups")
    group = relationship("Group", back_populates="members")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)

    # ✅ Keep only created_at
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    
    # Track which user's WhatsApp session received this message (for multi-user isolation)
    receiver_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    # ML-based priority detection fields
    priority_level = Column(String(10), default="MEDIUM",
                            nullable=False)  # HIGH, MEDIUM, LOW
    urgency_score = Column(Float, default=0.5, nullable=False)  # 0.0 to 1.0
    # Extracted deadline if any
    deadline_extracted = Column(DateTime(timezone=True), nullable=True)
    # JSON string of extracted keywords
    extracted_keywords = Column(Text, nullable=True)
    # 0=normal, 1=priority
    is_priority = Column(Integer, default=0, nullable=False)

    # RAG Support Fields (Added for Chatbot)
    media_url = Column(String(500), nullable=True) # URL/Path to stored file
    media_type = Column(String(20), default="text", nullable=False) # text, image, document, audio
    extracted_text = Column(Text, nullable=True) # Full text content for RAG analysis
    
    # AI Memory System - Ephemeral Media Processing (NEW)
    extracted_content = Column(Text, nullable=True) # Full text from PDF/image via Azure AI (no file stored)
    ai_summary = Column(String(500), nullable=True) # AI-generated title/summary
    
    # Feedback Loop Field
    is_manual_override = Column(Boolean, default=False, nullable=False) # True if set by user manually

    # Enhanced ML fields for Indian student context
    # CLASS_CANCEL, SUBMISSION, EXAM, ATTENDANCE, GENERAL
    message_category = Column(String(20), default="GENERAL", nullable=False)
    # JSON string of academic context analysis
    academic_context = Column(Text, nullable=True)

    # Soft delete field for trash bin functionality
    # NULL = not deleted, timestamp = deleted
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    sender = relationship("User", back_populates="messages", foreign_keys=[sender_id])
    group = relationship("Group", back_populates="messages")




# --- Scheduled Events for Deadline Management ---

class ScheduledEvent(Base):
    __tablename__ = "scheduled_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    
    # Event details
    title = Column(String(500), nullable=False)  # From AI summary or content
    description = Column(Text, nullable=True)     # Full message content
    deadline = Column(DateTime(timezone=True), nullable=False)
    
    # Notification settings
    notify_1h_before = Column(Boolean, default=True)
    notify_1d_before = Column(Boolean, default=True)
    notification_sent_1h = Column(Boolean, default=False)
    notification_sent_1d = Column(Boolean, default=False)
    
    # Status
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User")
    message = relationship("Message")


# --- AI Integration Models ---

class UserContext(Base):
    __tablename__ = "user_context"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    context_data = Column(JSONB, default={})
    preferences = Column(JSONB, default={})
    important_contacts = Column(JSONB, default=[])
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="context")


class AnalyzedMessage(Base):
    __tablename__ = "analyzed_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    message_id = Column(String(255)) # External ID if needed
    group_name = Column(String(255))
    sender_name = Column(String(255))
    message_type = Column(String(50)) # text, image, pdf, voice
    original_content = Column(Text)
    ai_summary = Column(Text)
    priority = Column(String(20)) # high, medium, low
    category = Column(String(50)) # work, personal, urgent, etc
    action_items = Column(JSONB, default=[])
    deadline = Column(DateTime(timezone=True), nullable=True)
    is_important = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="analyzed_messages")
    generated_tasks = relationship("AITask", back_populates="source_message")


class AITask(Base):
    __tablename__ = "ai_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    source_message_id = Column(Integer, ForeignKey("analyzed_messages.id"))
    task_description = Column(Text, nullable=False)
    priority = Column(String(20))
    deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="pending") # pending, done
    created_by_ai = Column(Boolean, default=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="ai_tasks")
    source_message = relationship("AnalyzedMessage", back_populates="generated_tasks")


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    context_used = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="ai_conversations")
