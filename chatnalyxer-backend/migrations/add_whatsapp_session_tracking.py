"""
Add WhatsApp session tracking columns to users table
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Connect to PostgreSQL
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

try:
    print("🔄 Adding WhatsApp session tracking columns...")
    
    # Add whatsapp_connected column
    print("1. Adding whatsapp_connected column...")
    cur.execute("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS whatsapp_connected BOOLEAN DEFAULT FALSE;
    """)
    
    # Add whatsapp_session_port column
    print("2. Adding whatsapp_session_port column...")
    cur.execute("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS whatsapp_session_port INTEGER NULL;
    """)
    
    # Add whatsapp_last_connected column
    print("3. Adding whatsapp_last_connected column...")
    cur.execute("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS whatsapp_last_connected TIMESTAMP WITH TIME ZONE NULL;
    """)
    
    # Add whatsapp_qr_code column
    print("4. Adding whatsapp_qr_code column...")
    cur.execute("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS whatsapp_qr_code TEXT NULL;
    """)
    
    # Add whatsapp_pairing_code column
    print("5. Adding whatsapp_pairing_code column...")
    cur.execute("""
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS whatsapp_pairing_code VARCHAR(8) NULL;
    """)
    
    # Create index on whatsapp_connected for faster queries
    print("6. Creating index on whatsapp_connected...")
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_users_whatsapp_connected 
        ON users(whatsapp_connected) 
        WHERE whatsapp_connected = TRUE;
    """)
    
    conn.commit()
    print("✅ Migration completed successfully!")
    
except Exception as e:
    conn.rollback()
    print(f"❌ Migration failed: {e}")
    raise
finally:
    cur.close()
    conn.close()
