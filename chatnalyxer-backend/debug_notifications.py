from app.database import SessionLocal
from app import models

db = SessionLocal()
try:
    # Get the latest user (assuming user is interacting)
    # Or count all notifications
    count = db.query(models.Notification).count()
    print(f"Total Notifications: {count}")
    
    notifications = db.query(models.Notification).order_by(models.Notification.created_at.desc()).limit(5).all()
    for n in notifications:
        print(f"ID: {n.id}, Title: {n.title}, User: {n.user_id}, Scheduled: {n.scheduled_time}")

except Exception as e:
    print(e)
finally:
    db.close()
