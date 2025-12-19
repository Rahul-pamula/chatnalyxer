from app.database import SessionLocal
from app.models import User

db = SessionLocal()

print("Scanning for users with 7330864041...")
users = db.query(User).filter(User.phone_number.like("%7330864041")).all()

for u in users:
    print(f"User ID={u.id}, Phone='{u.phone_number}', Username='{u.username}'")
    if u.user_profile:
        print(f"   -> Has Profile: {u.user_profile.user_type}")
    else:
        print(f"   -> NO PROFILE")

db.close()
