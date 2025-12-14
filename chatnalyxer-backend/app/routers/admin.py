from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from ..database import get_db
from .. import models
from .whatsapp import whatsapp_statuses, kill_session

router = APIRouter(prefix="/admin", tags=["Admin"])

# Hardcoded admin credentials (should be in env for production, but using env passing for now)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

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
    
    active_count = 0
    
    for user in users:
        uid = str(user.id)
        # Check if they have an entry in whatsapp_statuses
        wa_status = whatsapp_statuses.get(uid)
        
        is_active = False
        status_msg = "Offline"
        pid = None
        
        if wa_status:
            # Consider active if 'ready' is true OR if there is a running PID
            if wa_status.get('ready') or wa_status.get('pid'):
                is_active = True
                active_count += 1
            
            status_msg = wa_status.get('message', 'Offline')
            pid = wa_status.get('pid')
            
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
def admin_stop_user(user_id: int):
    """
    Admin endpoint to remotely kill a user's WhatsApp session
    """
    str_uid = str(user_id)
    success = kill_session(str_uid)
    
    if success:
        return {"message": f"Successfully stopped session for user {user_id}"}
    else:
        # If it failed, it might be because it wasn't running, but kill_session handles that gracefully mostly.
        # If it returns False, it's a critical error.
        raise HTTPException(status_code=500, detail="Failed to stop user session")

# --- OTP Service Management Endpoints ---
# These endpoints allow the Admin Dashboard to manage the dedicated OTP Sender WhatsApp
import requests
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
