from app.database import SessionLocal
from app.models import User, UserProfile

db = SessionLocal()

print("Syncing UserProfile data to User table...")

# Find all users with profiles
profiles = db.query(UserProfile).all()

count = 0
for profile in profiles:
    user = db.query(User).filter(User.id == profile.user_id).first()
    if user:
        if user.user_type != profile.user_type or user.profile_data != profile.profile_data:
            print(f"Syncing User ID {user.id}: {user.user_type} -> {profile.user_type}")
            user.user_type = profile.user_type
            user.profile_data = profile.profile_data
            db.add(user)
            count += 1

db.commit()
print(f"✅ Synced {count} users.")
db.close()
