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
    
    # Debug log
    qr_len = len(status.get('qr_code', '') or '')
    print(f"DEBUG: Received status for user_id={user_id}. QR Length: {qr_len}. Keys: {status.keys()}")

    # Merge with existing status to preserve fields if not provided in update
    current = whatsapp_statuses.get(user_id, {})
    whatsapp_statuses[user_id] = {**current, **status}
    
    return {"message": "Status updated"}


def kill_session(user_id: str) -> bool:
    """
    Helper function to kill the WhatsApp process and clear session for a given user.
    Returns True if successful (or already stopped), False if error.
    """
    import signal
    import time
    import shutil
    
    print(f"DEBUG: kill_session requested for user {user_id}")
    
    try:
        # Check for stored PID
        status = whatsapp_statuses.get(user_id, {})
        pid = status.get('pid')
        
        print(f"DEBUG: Current status for {user_id}: {status}")
        
        if pid:
            try:
                print(f"🛑 Killing process with PID: {pid}")
                os.kill(pid, signal.SIGTERM)
                # Wait a split second to ensure it's gone
                time.sleep(0.5)
                print(f"✅ Process {pid} killed successfully via os.kill")
            except ProcessLookupError:
                print(f"⚠️ Process {pid} not found (already dead?)")
            except Exception as e:
                print(f"⚠️ Failed to kill process {pid}: {e}")
        else:
            # Fallback to pkill if no PID found (legacy support)
            print(f"⚠️ No PID found for user {user_id}, falling back to pkill")
            # Log what we are trying to kill
            target = f"node index.js {user_id}"
            print(f"DEBUG: Running pkill -f '{target}'")
            try:
                result = subprocess.run(["pkill", "-f", target], check=False, capture_output=True, text=True)
                print(f"DEBUG: pkill result: returncode={result.returncode}, stdout='{result.stdout.strip()}', stderr='{result.stderr.strip()}'")
            except Exception as pk_err:
                 print(f"⚠️ pkill failed: {pk_err}")
        
        print(f"🛑 Stopped WhatsApp process for user {user_id}")
        
        # Clear auth session folder for fresh start
        whatsapp_dir = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.dirname(__file__)))), "whatsapp-integration")
        auth_path = os.path.join(whatsapp_dir, f"auth_info_baileys_{user_id}")
        
        if os.path.exists(auth_path):
            try:
                shutil.rmtree(auth_path, ignore_errors=True)
                print(f"🧹 Cleared auth session for user {user_id}")
            except Exception as e:
                print(f"⚠️ Failed to clear auth session: {e}")
        
        # Clear status
        whatsapp_statuses[user_id] = {
            "message": "Stopped",
            "ready": False,
            "qr_code": None,
            "pairing_code": None,
            "expired": False,
            "pid": None
        }
        return True
    except Exception as e:
        print(f"❌ Critical error in kill_session: {e}")
        return False


@router.get("/status")
def get_whatsapp_status(current_user=Depends(get_current_user)):
    user_id = str(current_user.id)
    status = whatsapp_statuses.get(user_id, {"message": "WhatsApp not linked", "ready": False, "qr_code": None, "pairing_code": None, "expired": False})
    
    # Debug log (only if QR is present to avoid spam, or just periodically?)
    # Printing every time might spam, but we need to see it.
    qr_present = "YES" if status.get("qr_code") else "NO"
    print(f"DEBUG: Serving status for user_id={user_id}. QR Present: {qr_present}")
    
    return status


@router.post("/stop")
def stop_whatsapp(current_user=Depends(get_current_user)):
    """Kill the WhatsApp process and clear session for this user"""
    user_id = str(current_user.id)
    success = kill_session(user_id)
    if success:
        return {"message": "WhatsApp process stopped and session cleared"}
    else:
        raise HTTPException(status_code=500, detail="Failed to stop WhatsApp process")


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
        
        # Prepare environment variables
        env = os.environ.copy()
        env = os.environ.copy()
        # FORCE localhost for the node process since we are running locally
        # This addresses the issue where Node sends data to Render instead of local backend
        # Use dynamic PORT (Render provides this env var)
        port = os.getenv("PORT", "8000")
        env["API_BASE_URL"] = f"http://127.0.0.1:{port}"
        
        process = subprocess.Popen(cmd, cwd=whatsapp_dir, env=env)
        print(f"✅ Subprocess started with PID: {process.pid}")
        
        # Update status with PID
        current = whatsapp_statuses.get(user_id, {})
        new_status = {**current, "pid": process.pid}
        whatsapp_statuses[user_id] = new_status
        
        return {"message": "WhatsApp integration started", "pid": process.pid}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start WhatsApp: {str(e)}")
