
from app.database import SessionLocal
from app import models, utils
import sys

def reset_password():
    db = SessionLocal()
    try:
        phone = "+917330864041"
        new_pass = "@RAHUL123"
        
        print(f"🔍 Finding user with phone: {phone}")
        user = db.query(models.User).filter(models.User.phone_number == phone).first()
        
        if not user:
            print("❌ User not found!")
            return
            
        print(f"✅ User found: {user.username} (ID: {user.id})")
        
        print("🔄 Updating password...")
        user.hashed_password = utils.hash_password(new_pass)
        db.commit()
        print("✅ Password updated successfully to: " + new_pass)
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_password()
