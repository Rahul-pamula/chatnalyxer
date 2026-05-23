from fastapi import FastAPI
from app import models
from app.database import engine
from app.routers import (
    auth, messages, users, groups, ai, dashboard, whatsapp, admin, email, pdf, notifications, events, media, debug, speech, consent
)
from fastapi.middleware.cors import CORSMiddleware

# Auto-create tables (for dev only)
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI
app = FastAPI(
    title="Chatnalyxer API",
    description="Backend API for Chatnalyxer (users, groups, messages, auth)",
    version="1.0.0"
)

# ---------------------------------------------------------
# CRITICAL: Auto-run migration on startup
# Because Render Start Command might override our shell script
# ---------------------------------------------------------
try:
    print("🔄 Attempting auto-migration during startup...")
    import sys
    import os
    if os.getcwd() not in sys.path:
        sys.path.append(os.getcwd())
    
    # Migration 1: Add user_id to groups
    from migrate_groups_userid import migrate
    migrate()
    
    # Migration 2: Add receiver_user_id to messages
    from migrate_receiver_user_id import migrate as migrate_receiver
    migrate_receiver()
    
    # Migration 3: Add scheduled_events table
    from migrate_scheduled_events import migrate as migrate_events
    migrate_events()

    # Migration 4: Isolate groups per user
    from migrate_groups_isolation import migrate as migrate_isolation
    migrate_isolation()

    # Migration 5: Add consent fields
    from migrate_user_consent import migrate as migrate_user_consent
    migrate_user_consent()
    
    print("✅ Auto-migration success!")
except Exception as e:
    print(f"⚠️ Auto-migration failed (might be already done): {e}")
# ---------------------------------------------------------

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow all for dev
    allow_credentials=True,  # Enable credentials for mobile app
    allow_methods=["*"],
    allow_headers=["*"],
)

# Healthcheck endpoints


@app.get("/")
def root():
    return {"message": "Chatnalyxer backend running 🚀"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/fix-db")
def fix_database_schema():
    """Manually trigger migration to add user_id column if missing"""
    import os
    import sys
    # Ensure current directory is in path
    if os.getcwd() not in sys.path:
        sys.path.append(os.getcwd())
        
    try:
        from migrate_groups_userid import migrate
        migrate()
        return {"message": "Migration run successfully. Check logs for details."}
    except Exception as e:
        return {"error": f"Migration failed: {str(e)}"}


# Routers
app.include_router(auth.router)
app.include_router(messages.router)
app.include_router(users.router)
app.include_router(groups.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(whatsapp.router)
app.include_router(admin.router)
app.include_router(email.router)
app.include_router(consent.router)
app.include_router(pdf.router)
app.include_router(notifications.router)
app.include_router(events.router)
app.include_router(media.router)
app.include_router(debug.router) # NEW: Debug endpoints
app.include_router(speech.router) # NEW: Voice assistant endpoints

# Import and add test router
from app.routers import test_events
app.include_router(test_events.router)

from app.database import get_db
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from app.models import User
from app.services.notification_service import send_expo_push_notification

@app.get("/test-notification")
async def test_notification_endpoint(db: Session = Depends(get_db)):
    user = db.query(User).filter(User.push_token != None).first()
    if not user:
        return {"error": "No user found with a push token"}
        
    success = await send_expo_push_notification(
        push_token=user.push_token,
        title="Test Notification 🔔",
        body="If you see this, the notification system is working perfectly!",
        data={"test": True}
    )
    
    return {"success": success, "user_id": user.id, "token": user.push_token}


# Start notification scheduler (optional)
@app.on_event("startup")
async def startup_event():
    try:
        from app.services.notification_service import start_notification_scheduler
        from app.database import SessionLocal
        start_notification_scheduler(SessionLocal)
        print("✅ Notification scheduler started")
    except ImportError as e:
        print(f"⚠️ Notification scheduler disabled: {e}")
        print("💡 To enable notifications, activate venv and install: pip install APScheduler")

@app.on_event("shutdown")
async def shutdown_event():
    try:
        from app.services.notification_service import stop_notification_scheduler
        stop_notification_scheduler()
        print("🛑 Notification scheduler stopped")
    except ImportError:
        pass

