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
        
        whatsapp_dir = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.dirname(__file__)))), "whatsapp-integration")
        # Start node index.cjs with user_id AND phone_number
        cmd = ["node", "index.cjs", user_id]
        if phone_number:
            cmd.append(phone_number)
            
        print(f"🚀 Launching WhatsApp subprocess: {' '.join(cmd)} in {whatsapp_dir}")
        
        # SELF-HEALING: Install dependencies if missing OR if specific package is missing
        node_modules_path = os.path.join(whatsapp_dir, "node_modules")
        webjs_path = os.path.join(node_modules_path, "whatsapp-web.js")
        
        # Check if the folder is missing OR if the critical dependency is missing
        if not os.path.exists(node_modules_path) or not os.path.exists(webjs_path):
            print(f"⚠️ Dependencies missing (Checked: {webjs_path}). Running 'npm install'...")
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
                    
                # Verify whatsapp-web.js was actually installed
                if not os.path.exists(webjs_path):
                    raise Exception(f"whatsapp-web.js package still not found after npm install at: {webjs_path}")
                    
                print(f"✅ whatsapp-web.js package verified at: {webjs_path}")
                    
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
