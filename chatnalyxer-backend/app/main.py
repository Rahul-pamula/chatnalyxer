from fastapi import FastAPI
from app import models
from app.database import engine
from app.routers import (
    auth, messages, users, groups, ai, dashboard, whatsapp, admin, email, pdf, notifications, events, media, debug, speech
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
    from migrate_groups_userid import migrate
    migrate()
    print("✅ Auto-migration success!")
except Exception as e:
    print(f"⚠️ Auto-migration failed (might be already done): {e}")
# ---------------------------------------------------------

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow all for dev
    allow_credentials=False,
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
app.include_router(pdf.router)
app.include_router(notifications.router)
app.include_router(events.router)
app.include_router(media.router)
app.include_router(debug.router) # NEW: Debug endpoints
app.include_router(speech.router) # NEW: Voice assistant endpoints

# Import and add test router
from app.routers import test_events
app.include_router(test_events.router)


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

