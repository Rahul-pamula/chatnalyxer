"""
Quick script to update user phone number for testing
"""
import os
from sqlalchemy import create_engine, text

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.ywjhxkfbfpbkrqwmjnmv:Rahul%402005@aws-0-ap-south-1.pooler.supabase.com:6543/postgres")

# Create engine
engine = create_engine(DATABASE_URL)

# Get user ID and new phone number
user_id = input("Enter your user ID: ")
new_phone = input("Enter your WhatsApp phone number (with country code, e.g., 919876543210): ")

# Update phone number
with engine.connect() as conn:
    result = conn.execute(
        text("UPDATE users SET phone_number = :phone WHERE id = :user_id"),
        {"phone": new_phone, "user_id": user_id}
    )
    conn.commit()
    print(f"✅ Updated phone number for user {user_id} to {new_phone}")
    
    # Verify
    user = conn.execute(
        text("SELECT id, username, phone_number FROM users WHERE id = :user_id"),
        {"user_id": user_id}
    ).fetchone()
    
    if user:
        print(f"\n📱 User Details:")
        print(f"   ID: {user[0]}")
        print(f"   Username: {user[1]}")
        print(f"   Phone: {user[2]}")
