from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .database import Base
#from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func


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
<<<<<<< HEAD
    content = Column(Text, nullable=False)   # Use Text for longer messages
=======
    content = Column(Text, nullable=False)

    # ❌ Remove this line if it exists
    # timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # ✅ Keep only created_at
>>>>>>> feature/backend-auth
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)

<<<<<<< HEAD
=======
    sender = relationship("User", back_populates="messages")
    group = relationship("Group", back_populates="messages")
>>>>>>> feature/backend-auth
    # relationships
    sender = relationship("User", back_populates="messages")
    group = relationship("Group", back_populates="messages")
