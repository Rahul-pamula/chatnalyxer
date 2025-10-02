#!/usr/bin/env python3
"""
Create database tables from SQLAlchemy models
"""
from app.database import engine
from app.models import Base

def create_tables():
    """Create all tables defined in models"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

if __name__ == "__main__":
    create_tables()