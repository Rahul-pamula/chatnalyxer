from app.database import SessionLocal
from app.models import User

db = SessionLocal()

phone = "+917330864041"
user = db.query(User).filter(User.phone_number == phone).first()

if user:
    print(f"User ID={user.id}")
    print(f"User Table Type: {user.user_type}")
    print(f"User Table Data: {user.profile_data}")
    
    if user.user_profile:
        print(f"UserProfile Table Type: {user.user_profile.user_type}")
        print(f"UserProfile Table Data: {user.user_profile.profile_data}")
    else:
        print("UserProfile Relation: None")
else:
    print("User not found")

db.close()
