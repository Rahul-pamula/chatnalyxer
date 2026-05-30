from app.database import SessionLocal
from app import models

db = SessionLocal()
users = db.query(models.User).all()

print(f"{'ID':<5} {'Username':<20} {'Phone':<15}")
print("-" * 40)
for user in users:
    print(f"{user.id:<5} {user.username:<20} {user.phone_number:<15}")
