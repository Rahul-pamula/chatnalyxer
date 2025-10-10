from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, func
from sqlalchemy.orm import relationship
from .database import Base
from sqlalchemy.sql import func


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # relationship
    messages = relationship("Message", back_populates="sender")
    groups = relationship("GroupMember", back_populates="user")


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
