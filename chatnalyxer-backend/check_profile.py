from app.database import SessionLocal
from app.models import User, UserProfile

db = SessionLocal()

# Try searching by username + variants
username = "@RAHUL123"
user = db.query(User).filter(User.username == username).first()

if not user:
    # Try searching by phone with +91
    phone = "+917330864041"
    user = db.query(User).filter(User.phone_number == phone).first()

if user:
    print(f"✅ User Found: ID={user.id}, Username={user.username}, Phone={user.phone_number}")
    
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    
    if profile:
        print(f"✅ Profile Found: ID={profile.id}")
        print(f"   Type: {profile.user_type}")
        print(f"   Data: {profile.profile_data}")
    else:
        print("❌ NO PROFILE FOUND for this user!")
else:
    print(f"❌ User NOT FOUND (Checked @RAHUL123 and +917330864041)")

db.close()
