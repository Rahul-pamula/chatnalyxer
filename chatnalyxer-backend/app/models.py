from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, func, Boolean
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

    # relationship
    messages = relationship("Message", back_populates="sender")
    groups = relationship("GroupMember", back_populates="user")
    
    # AI relationships
    context = relationship("UserContext", back_populates="user", uselist=False)
    analyzed_messages = relationship("AnalyzedMessage", back_populates="user")
    ai_tasks = relationship("AITask", back_populates="user")
    ai_conversations = relationship("AIConversation", back_populates="user")


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
    name = Column(String(120), index=True, nullable=False)
    whatsapp_id = Column(String(255), unique=True, index=True,
                         nullable=True)  # WhatsApp group ID
    # 0=not selected, 1=selected
    is_selected = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    # relationship
    messages = relationship("Message", back_populates="group")
    members = relationship("GroupMember", back_populates="group")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)

    user = relationship("User", back_populates="groups")
    group = relationship("Group", back_populates="members")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)

    # ✅ Keep only created_at
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)

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

    # Enhanced ML fields for Indian student context
    # CLASS_CANCEL, SUBMISSION, EXAM, ATTENDANCE, GENERAL
    message_category = Column(String(20), default="GENERAL", nullable=False)
    # JSON string of academic context analysis
    academic_context = Column(Text, nullable=True)

    # Soft delete field for trash bin functionality
    # NULL = not deleted, timestamp = deleted
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    sender = relationship("User", back_populates="messages")
    group = relationship("Group", back_populates="messages")


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
