from fastapi import APIRouter, HTTPException, Depends
import subprocess
import os
from ..deps import get_current_user

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

whatsapp_statuses = {}  # user_id: {"message": "", "ready": False, "qr_code": None, "pairing_code": None}


@router.post("/status")
def set_whatsapp_status(status: dict):
    user_id = status.pop('user_id', None)
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    # Merge with existing status to preserve fields if not provided in update
    current = whatsapp_statuses.get(user_id, {})
    whatsapp_statuses[user_id] = {**current, **status}
    
    return {"message": "Status updated"}


@router.get("/status")
def get_whatsapp_status(current_user=Depends(get_current_user)):
    user_id = str(current_user.id)
    return whatsapp_statuses.get(user_id, {"message": "WhatsApp not linked", "ready": False, "qr_code": None, "pairing_code": None})


@router.post("/start")
def start_whatsapp(current_user=Depends(get_current_user)):
    user_id = str(current_user.id)
    # Get phone number and strip special characters for command line argument
    phone_number = current_user.phone_number.replace('+', '').replace(' ', '') if current_user.phone_number else ""
    
    try:
        # Kill any existing node processes for this user
        try:
            subprocess.run(["pkill", "-f", f"node index.js {user_id}"], check=False)
            print(f"🧹 Killed any existing node processes for user {user_id}")
        except:
            pass
        
        # Clean up any existing SingletonLock for this user
        session_dir = os.path.join(os.path.expanduser("~"), f".wwebjs-sessions-{user_id}")
        singleton_lock = os.path.join(session_dir, f"session-chatnalyxer-bot-{user_id}", "SingletonLock")
        
        if os.path.exists(singleton_lock):
            print(f"🧹 Removing existing SingletonLock for user {user_id}")
            os.remove(singleton_lock)
        
        # Wait a moment for processes to fully terminate
        import time
        time.sleep(1)
        
        # Path to whatsapp-integration directory
        whatsapp_dir = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.dirname(__file__)))), "whatsapp-integration")
        # Start node index.js with user_id AND phone_number
        cmd = ["node", "index.js", user_id]
        if phone_number:
            cmd.append(phone_number)
            
        print(f"🚀 Launching WhatsApp subprocess: {' '.join(cmd)} in {whatsapp_dir}")
        process = subprocess.Popen(cmd, cwd=whatsapp_dir)
        print(f"✅ Subprocess started with PID: {process.pid}")
        
        return {"message": "WhatsApp integration started", "pid": process.pid}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start WhatsApp: {str(e)}")
