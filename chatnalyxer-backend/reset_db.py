#!/usr/bin/env python3
"""
Reset database - drop and recreate tables
"""
from app.database import engine
from app.models import Base
from sqlalchemy import text

def reset_database():
    """Drop and recreate all tables"""
    print("Resetting database...")

    with engine.connect() as conn:
        # Drop the groups table if it exists
        conn.execute(text("DROP TABLE IF EXISTS groups CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS messages CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
        conn.commit()
        print("Dropped existing tables")

    # Create all tables from models
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables recreated successfully!")

if __name__ == "__main__":
    reset_database()