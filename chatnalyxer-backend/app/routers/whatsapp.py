from fastapi import APIRouter, HTTPException, Depends
import subprocess
import os
from ..deps import get_current_user

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

whatsapp_statuses = {}  # user_id: {"message": "", "ready": False, "qr_code": None, "pairing_code": None, "expired": False}


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
    return whatsapp_statuses.get(user_id, {"message": "WhatsApp not linked", "ready": False, "qr_code": None, "pairing_code": None, "expired": False})


@router.post("/stop")
def stop_whatsapp(current_user=Depends(get_current_user)):
    """Kill the WhatsApp process and clear session for this user"""
    user_id = str(current_user.id)
    
    try:
        # Kill existing node processes
        subprocess.run(["pkill", "-f", f"node index.js {user_id}"], check=False)
        print(f"🛑 Stopped WhatsApp process for user {user_id}")
        
        # Clear auth session folder for fresh start
        whatsapp_dir = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.dirname(__file__)))), "whatsapp-integration")
        auth_path = os.path.join(whatsapp_dir, f"auth_info_baileys_{user_id}")
        
        if os.path.exists(auth_path):
            import shutil
            shutil.rmtree(auth_path, ignore_errors=True)
            print(f"🧹 Cleared auth session for user {user_id}")
        
        # Clear status
        whatsapp_statuses[user_id] = {
            "message": "Stopped",
            "ready": False,
            "qr_code": None,
            "pairing_code": None,
            "expired": False
        }
        return {"message": "WhatsApp process stopped and session cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop WhatsApp: {str(e)}")


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
        
        whatsapp_dir = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.dirname(__file__)))), "whatsapp-integration")
        
        # Clear old session folder for fresh start (prevents 401 loops)
        auth_path = os.path.join(whatsapp_dir, f"auth_info_baileys_{user_id}")
        if os.path.exists(auth_path):
            import shutil
            shutil.rmtree(auth_path, ignore_errors=True)
            print(f"🧹 Cleared old auth session for fresh start - user {user_id}")
        
        # Clean up any existing SingletonLock for this user (legacy cleanup)
        session_dir = os.path.join(os.path.expanduser("~"), f".wwebjs-sessions-{user_id}")
        singleton_lock = os.path.join(session_dir, f"session-chatnalyxer-bot-{user_id}", "SingletonLock")
        
        if os.path.exists(singleton_lock):
            print(f"🧹 Removing existing SingletonLock for user {user_id}")
            os.remove(singleton_lock)
        
        # Wait a moment for processes to fully terminate
        import time
        time.sleep(1)
        
        # Reset status for fresh start
        whatsapp_statuses[user_id] = {
            "message": "Initializing...",
            "ready": False,
            "qr_code": None,
            "pairing_code": None,
            "expired": False
        }
        
        # Start node index.js with user_id AND phone_number
        cmd = ["node", "index.js", user_id]
        if phone_number:
            cmd.append(phone_number)
            
        print(f"🚀 Launching WhatsApp subprocess: {' '.join(cmd)} in {whatsapp_dir}")
        
        # SELF-HEALING: Install dependencies if missing OR if specific package is missing
        node_modules_path = os.path.join(whatsapp_dir, "node_modules")
        baileys_path = os.path.join(node_modules_path, "@whiskeysockets", "baileys")
        
        # Check if the folder is missing OR if the critical dependency is missing
        if not os.path.exists(node_modules_path) or not os.path.exists(baileys_path):
            print(f"⚠️ Dependencies missing (Checked: {baileys_path}). Running 'npm install'...")
            try:
                # Run npm install with inherited environment and WAIT for completion
                install_cmd = ["npm", "install"]
                install_result = subprocess.run(
                    install_cmd, 
                    cwd=whatsapp_dir, 
                    capture_output=True, 
                    text=True,
                    check=True,  # Raise exception on non-zero return code
                    timeout=120  # 2 minute timeout for npm install
                )
                print(f"📦 'npm install' completed successfully")
                if install_result.stdout:
                    print(f"STDOUT: {install_result.stdout[:500]}")  # Truncate long output
                    
                # Verify Baileys was actually installed
                if not os.path.exists(baileys_path):
                    raise Exception(f"Baileys package still not found after npm install at: {baileys_path}")
                    
                print(f"✅ Baileys package verified at: {baileys_path}")
                    
            except subprocess.TimeoutExpired:
                raise HTTPException(
                    status_code=500, 
                    detail="npm install timed out. Please try again or contact support."
                )
            except subprocess.CalledProcessError as e:
                print(f"❌ npm install failed with return code {e.returncode}")
                print(f"STDERR: {e.stderr}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to install WhatsApp dependencies: {e.stderr[:200]}"
                )
            except Exception as e:
                print(f"❌ Failed to auto-install dependencies: {e}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to prepare WhatsApp integration: {str(e)}"
                )
        
        process = subprocess.Popen(cmd, cwd=whatsapp_dir)
        print(f"✅ Subprocess started with PID: {process.pid}")
        
        return {"message": "WhatsApp integration started", "pid": process.pid}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start WhatsApp: {str(e)}")
