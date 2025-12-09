from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, func, Boolean
from sqlalchemy.orm import relationship
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
