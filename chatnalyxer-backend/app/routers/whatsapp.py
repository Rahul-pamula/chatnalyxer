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
        
        # DEBUG: Check if node_modules exists and has content
        node_modules_path = os.path.join(whatsapp_dir, "node_modules")
        if os.path.exists(node_modules_path):
            print(f"📂 node_modules found at {node_modules_path}")
            try:
                contents = os.listdir(node_modules_path)
                print(f"📦 node_modules contains {len(contents)} items. First 5: {contents[:5]}")
                if "@whiskeysockets" in contents:
                    ws_path = os.path.join(node_modules_path, "@whiskeysockets")
                    print(f"Found @whiskeysockets. Contents: {os.listdir(ws_path)}")
                else:
                    print("⚠️ @whiskeysockets folder NOT found in node_modules")
            except Exception as e:
                print(f"⚠️ Error listing node_modules: {e}")
        else:
            print(f"❌ node_modules directory DOES NOT EXIST at {node_modules_path}")

        process = subprocess.Popen(cmd, cwd=whatsapp_dir)
        print(f"✅ Subprocess started with PID: {process.pid}")
        
        return {"message": "WhatsApp integration started", "pid": process.pid}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start WhatsApp: {str(e)}")
