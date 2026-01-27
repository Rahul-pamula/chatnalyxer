#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load env from backend folder
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'chatnalyxer-backend')
sys.path.append(backend_path)
load_dotenv(os.path.join(backend_path, '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env file (looked in backend folder)")
    sys.exit(1)

print(f"🔌 Connecting to database...")

# Fix protocol
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Add SSL mode (Supabase specific)
connect_args = {}
if "supabase" in DATABASE_URL:
    if "sslmode" not in DATABASE_URL:
        delimiter = "&" if "?" in DATABASE_URL else "?"
        DATABASE_URL += f"{delimiter}sslmode=require"
    connect_args = {
        "sslmode": "require",
        "connect_timeout": 10
    }

try:
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args
    )
    
    with engine.connect() as conn:
        print("🔍 Attempting to drop legacy constraints/indexes on 'groups'...")
        
        # 1. Try dropping as a Constraint
        try:
            conn.execute(text('ALTER TABLE groups DROP CONSTRAINT "ix_groups_whatsapp_id"'))
            conn.commit()
            print("✅ Dropped constraint 'ix_groups_whatsapp_id'")
        except Exception as e:
            conn.rollback()
            print(f"ℹ️ Constraint drop skipped (not a constraint): {e}")

        # 2. Try dropping as an Index
        try:
            conn.execute(text('DROP INDEX IF EXISTS "ix_groups_whatsapp_id"'))
            conn.commit()
            print("✅ Dropped index 'ix_groups_whatsapp_id'")
        except Exception as e:
            conn.rollback()
            print(f"ℹ️ Index drop info: {e}")
            
        print("🎉 Database fix complete.")
        
except Exception as e:
    print(f"❌ Connection/Execution failed: {e}")
