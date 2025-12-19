from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, func, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from .database import Base
from sqlalchemy.sql import func
from datetime import datetime, timedelta

# ... (Previous User/OTP/Group/GroupMember/Message classes remain same - simplified for replacement) ...

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
    message_id = Column(String(255))
    group_name = Column(String(255))
    sender_name = Column(String(255))
    message_type = Column(String(50))
    original_content = Column(Text)
    ai_summary = Column(Text)
    priority = Column(String(20))
    category = Column(String(50))
    action_items = Column(JSONB, default=[])
    deadline = Column(DateTime(timezone=True), nullable=True)
    is_important = Column(Boolean, default=False)
    
    # Email Support (NEW)
    source = Column(String(20), default="whatsapp") 
    email_id = Column(String(255), nullable=True)
    subject = Column(Text, nullable=True)
    
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
    status = Column(String(20), default="pending")
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

# NEW EMAIL MODEL
class EmailCredential(Base):
    __tablename__ = "email_credentials"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    email_address = Column(String(255), nullable=False)
    app_password = Column(String(255), nullable=False)
    provider = Column(String(50), default="gmail")
    is_active = Column(Boolean, default=True)
    last_synced = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="email_credentials")
