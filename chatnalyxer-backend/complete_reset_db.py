#!/usr/bin/env python3
"""
Complete database reset - drop entire schema and recreate everything fresh
"""
from app.database import engine
from app.models import Base
from sqlalchemy import text, create_engine
import os

def complete_reset_database():
    """Completely reset the database by dropping all tables and recreating"""
    print("Starting complete database reset...")

    with engine.connect() as conn:
        # First, drop all tables with CASCADE to handle dependencies
        print("Dropping all existing tables with CASCADE...")
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        conn.commit()
        print("Successfully dropped and recreated schema")

    # Now create all tables fresh from models
    print("Creating tables from models...")
    Base.metadata.create_all(bind=engine)
    print("Database reset completed successfully!")

if __name__ == "__main__":
    complete_reset_database()