from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from ..database import get_db
from .. import models
# OLD: from .whatsapp import whatsapp_statuses, kill_session
# TODO: Update admin dashboard to use Session Manager API
import requests

router = APIRouter(prefix="/admin", tags=["Admin"])

# Hardcoded admin credentials (should be in env for production, but using env passing for now)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# Session Manager URL
SESSION_MANAGER_URL = os.getenv("SESSION_MANAGER_URL", "http://localhost:3002")

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminStats(BaseModel):
    total_users: int
    active_sessions: int

class UserStatus(BaseModel):
    user_id: int
    username: str
    phone_number: str
    is_active_scanner: bool
    status_message: Optional[str] = None
    pid: Optional[int] = None

@router.post("/login")
def admin_login(creds: AdminLogin):
    if creds.username == ADMIN_USERNAME and creds.password == ADMIN_PASSWORD:
        return {"message": "Login successful", "token": "admin-token-bypass"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.get("/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db)):
    # Get all users
    users = db.query(models.User).all()
    user_list = []
    
    # Get active sessions from Session Manager
    try:
        resp = requests.get(f"{SESSION_MANAGER_URL}/sessions/active", timeout=2)
        active_sessions_data = resp.json() if resp.status_code == 200 else {"sessions": []}
        active_sessions = {s["user_id"]: s for s in active_sessions_data.get("sessions", [])}
    except:
        active_sessions = {}
    
    active_count = 0
    
    for user in users:
        # Check if user has active session
        session = active_sessions.get(user.id)
        
        is_active = user.whatsapp_connected
        status_msg = "Connected" if is_active else "Offline"
        pid = session.get("pid") if session else None
        
        if is_active:
            active_count += 1
            
        user_list.append(UserStatus(
            user_id=user.id,
            username=user.username,
            phone_number=user.phone_number,
            is_active_scanner=is_active,
            status_message=status_msg,
            pid=pid
        ))
        
    return {
        "stats": AdminStats(
            total_users=len(users), 
            active_sessions=active_count
        ),
        "users": user_list
    }

@router.post("/stop-user/{user_id}")
def admin_stop_user(user_id: int, db: Session = Depends(get_db)):
    """
    Admin endpoint to remotely kill a user's WhatsApp session
    """
    try:
        # Call Session Manager to stop user session
        resp = requests.post(f"{SESSION_MANAGER_URL}/sessions/stop/{user_id}", timeout=5)
        
        if resp.status_code == 200:
            # Update database
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                user.whatsapp_connected = False
                user.whatsapp_session_port = None
                db.commit()
            
            return {"message": f"Successfully stopped session for user {user_id}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to stop session")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- OTP Service Management Endpoints ---
# These endpoints allow the Admin Dashboard to manage the dedicated OTP Sender WhatsApp
from ..services.whatsapp_service import OTP_SERVICE_URL

@router.get("/otp/status")
def get_otp_service_status():
    try:
        resp = requests.get(f"{OTP_SERVICE_URL}/status-json", timeout=5)
        if resp.status_code == 200:
            return resp.json() # { ready: bool, qr: string|null }
        return {"ready": False, "message": "OTP Service Unreachable"}
    except:
        return {"ready": False, "message": "OTP Service Offline"}

@router.post("/otp/connect")
def start_otp_service_connection():
    try:
        requests.post(f"{OTP_SERVICE_URL}/connect", timeout=5)
        return {"message": "Connection initiated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/otp/disconnect")
def stop_otp_service_connection():
    try:
        requests.post(f"{OTP_SERVICE_URL}/disconnect", timeout=5)
        return {"message": "Disconnected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# NEW: Enhanced Admin Dashboard Endpoints
# ============================================

@router.get("/sessions/active")
def get_active_sessions(db: Session = Depends(get_db)):
    """Get all active user WhatsApp sessions with detailed information"""
    try:
        response = requests.get(f"{SESSION_MANAGER_URL}/sessions/active", timeout=5)
        
        if response.status_code != 200:
            return {"sessions": [], "count": 0}
        
        sessions_data = response.json()
        sessions = sessions_data.get("sessions", [])
        
        # Enrich with user information
        enriched_sessions = []
        for session in sessions:
            user = db.query(models.User).filter(models.User.id == session["user_id"]).first()
            if user:
                enriched_sessions.append({
                    "user_id": session["user_id"],
                    "username": user.username,
                    "phone_number": user.phone_number,
                    "port": session["port"],
                    "status": session.get("status", "unknown"),
                    "uptime": session.get("uptime", "N/A"),
                    "started_at": session.get("started_at", "N/A"),
                    "pid": session.get("pid")
                })
        
        return {"sessions": enriched_sessions, "count": len(enriched_sessions)}
    except requests.exceptions.RequestException:
        return {"sessions": [], "count": 0, "error": "Session Manager unavailable"}

@router.get("/health")
def get_system_health(db: Session = Depends(get_db)):
    """Get health status of all services"""
    health_status = {
        "backend": {"status": "running", "port": 8000},
        "session_manager": {"status": "unknown", "port": 3002, "active_sessions": 0},
        "admin_otp": {"status": "unknown", "port": 3001},
        "database": {"status": "unknown", "total_users": 0, "total_messages": 0}
    }
    
    # Check Session Manager
    try:
        response = requests.get(f"{SESSION_MANAGER_URL}/sessions/active", timeout=2)
        if response.status_code == 200:
            data = response.json()
            health_status["session_manager"]["status"] = "running"
            health_status["session_manager"]["active_sessions"] = data.get("count", 0)
    except:
        health_status["session_manager"]["status"] = "stopped"
    
    # Check Admin OTP
    try:
        response = requests.get(f"{OTP_SERVICE_URL}/health", timeout=2)
        health_status["admin_otp"]["status"] = "running" if response.status_code == 200 else "stopped"
    except:
        health_status["admin_otp"]["status"] = "stopped"
    
    # Check Database
    try:
        health_status["database"]["status"] = "connected"
        health_status["database"]["total_users"] = db.query(models.User).count()
        health_status["database"]["total_messages"] = db.query(models.Message).count()
    except:
        health_status["database"]["status"] = "disconnected"
    
    return health_status

@router.post("/whatsapp/connect")
def admin_whatsapp_connect(db: Session = Depends(get_db)):
    """Start WhatsApp session for admin"""
    admin_user = db.query(models.User).filter(models.User.id == 1).first()
    if not admin_user:
        raise HTTPException(404, "Admin user not found")
    
    if admin_user.whatsapp_connected:
        return {"success": True, "message": "Already connected", "port": admin_user.whatsapp_session_port}
    
    response = requests.post(f"{SESSION_MANAGER_URL}/sessions/start/1", json={}, timeout=10)
    if response.status_code != 200:
        raise HTTPException(500, "Failed to start admin session")
    
    data = response.json()
    admin_user.whatsapp_connected = True
    admin_user.whatsapp_session_port = data.get("port")
    db.commit()
    
    return {"success": True, "message": "Admin session started", "port": data.get("port")}

@router.get("/whatsapp/status")
def admin_whatsapp_status(db: Session = Depends(get_db)):
    """Get admin WhatsApp status"""
    admin_user = db.query(models.User).filter(models.User.id == 1).first()
    if not admin_user or not admin_user.whatsapp_connected:
        return {"connected": False}
    
    response = requests.get(f"{SESSION_MANAGER_URL}/sessions/status/1", timeout=5)
    if response.status_code == 200:
        data = response.json()
        return {
            "connected": data.get("active", False),
            "port": admin_user.whatsapp_session_port,
            "phone_number": admin_user.phone_number,
            "qr_code": data.get("qr_code"),
            "ready": data.get("ready", False)
        }
    return {"connected": False}

@router.post("/whatsapp/disconnect")
def admin_whatsapp_disconnect(db: Session = Depends(get_db)):
    """Disconnect admin WhatsApp"""
    admin_user = db.query(models.User).filter(models.User.id == 1).first()
    if not admin_user:
        raise HTTPException(404, "Admin user not found")
    
    try:
        requests.post(f"{SESSION_MANAGER_URL}/sessions/stop/1", timeout=5)
    except:
        pass
    
    admin_user.whatsapp_connected = False
    admin_user.whatsapp_session_port = None
    db.commit()
    
    return {"success": True, "message": "Admin WhatsApp disconnected"}

@router.delete("/users/{user_id}")
def admin_delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete a user permanently with proper cascade.
    1. Stop active session if any via Session Manager.
    2. Manually delete related records that might cause foreign key issues.
    3. Delete user (which will cascade to most other records).
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    # Check if admin (prevent self-delete through this route if needed, or allow it)
    if user.username == ADMIN_USERNAME:
        raise HTTPException(400, "Cannot delete admin user via this route")

    # 1. Stop active session
    try:
        requests.post(f"{SESSION_MANAGER_URL}/sessions/stop/{user_id}", timeout=5)
    except:
        pass # Ignore error if session manager is down or session not active

    # 2. Manually delete ALL related records in correct order
    try:
        # Delete all user-related data first to avoid foreign key constraints
        
        # AI & Events
        db.query(models.UserInteraction).filter(models.UserInteraction.user_id == user_id).delete()
        db.query(models.Notification).filter(models.Notification.user_id == user_id).delete()
        db.query(models.Event).filter(models.Event.user_id == user_id).delete()
        db.query(models.ScheduledEvent).filter(models.ScheduledEvent.user_id == user_id).delete()
        db.query(models.AITask).filter(models.AITask.user_id == user_id).delete()
        db.query(models.AnalyzedMessage).filter(models.AnalyzedMessage.user_id == user_id).delete()
        db.query(models.AIConversation).filter(models.AIConversation.user_id == user_id).delete()
        db.query(models.UserContext).filter(models.UserContext.user_id == user_id).delete()
        db.query(models.EmailCredential).filter(models.EmailCredential.user_id == user_id).delete()
        db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).delete()
        
        # Messages (has foreign keys to user and groups)
        db.query(models.Message).filter(
            (models.Message.sender_id == user_id) | 
            (models.Message.receiver_user_id == user_id)
        ).delete(synchronize_session=False)
        
        # Group members
        db.query(models.GroupMember).filter(models.GroupMember.user_id == user_id).delete()
        
        # Delete user's groups
        db.query(models.Group).filter(models.Group.user_id == user_id).delete()
        
        # Finally delete the user
        db.delete(user)
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Database delete failed: {str(e)}")

    return {"success": True, "message": f"User {user_id} deleted permanently"}
