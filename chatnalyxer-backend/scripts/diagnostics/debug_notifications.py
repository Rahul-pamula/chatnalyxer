from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import models
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://postgres.hxbwhzkjvosdrksnrgwg:%40textNLytixs123@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

# Add SSL mode
if "sslmode" not in DATABASE_URL:
    DATABASE_URL += "?sslmode=require"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Fetch latest notifications
notes = db.query(models.Notification).order_by(models.Notification.created_at.desc()).limit(5).all()

print(f"{'ID':<5} {'Title':<40} {'Scheduled Time (Raw)':<30} {'Created At'}")
print("-" * 100)
for n in notes:
    print(f"{n.id:<5} {n.title[:38]:<40} {str(n.scheduled_time):<30} {n.created_at}")
