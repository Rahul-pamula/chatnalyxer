from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # relationship
    messages = relationship("Message", back_populates="sender")


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, index=True, nullable=False)

    # relationship
    messages = relationship("Message", back_populates="group")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)   # Use Text for longer messages
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)

    # relationships
    sender = relationship("User", back_populates="messages")
    group = relationship("Group", back_populates="messages")
