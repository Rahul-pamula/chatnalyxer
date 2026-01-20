"""
WhatsApp Session Management Router
Handles user WhatsApp connection/disconnection via Session Manager
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import requests
from datetime import datetime

from ..database import get_db
from ..models import User
from ..deps import get_current_user

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# Session Manager URL
SESSION_MANAGER_URL = "http://localhost:3002"


@router.post("/connect")
async def connect_whatsapp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start WhatsApp session for current user
    - Calls session manager to spawn user process
    - Updates user.whatsapp_connected = True
    """
    try:
        # ALWAYS stop any existing session first to get a fresh QR code
        # This prevents the "1/3, 2/3, 3/3" QR limit issue
        if current_user.whatsapp_connected:
            try:
                print(f"🔄 Stopping old session for user {current_user.id} to generate fresh QR...")
                requests.post(
                    f"{SESSION_MANAGER_URL}/sessions/stop/{current_user.id}",
                    timeout=5
                )
                # Wait a moment for session to fully stop
                import time
                time.sleep(0.5)
            except:
                pass

        # Start fresh session (will generate new QR code)
        print(f"🆕 Starting new WhatsApp session for user {current_user.id}...")
        response = requests.post(
            f"{SESSION_MANAGER_URL}/sessions/start/{current_user.id}",
            json={},  # Empty - will generate QR code
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(500, "Failed to start WhatsApp session")
        
        data = response.json()
        
        # Update database
        current_user.whatsapp_connected = True
        current_user.whatsapp_session_port = data.get("port")
        db.commit()
        
        print(f"✅ New session started on port {data.get('port')}")
        
        return {
            "success": True,
            "message": "WhatsApp session started - QR code will be available shortly",
            "user_id": current_user.id,
            "port": data.get("port")
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(503, f"Session manager unavailable: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Failed to connect WhatsApp: {str(e)}")


@router.post("/disconnect")
async def disconnect_whatsapp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stop WhatsApp session and clean up all state
    """
    try:
        if not current_user.whatsapp_connected:
            return {"success": True, "message": "Already disconnected"}

        # Call session manager to stop and clean auth
        print(f"🛑 Disconnecting WhatsApp for user {current_user.id}...")
        response = requests.post(
            f"{SESSION_MANAGER_URL}/sessions/stop/{current_user.id}",
            json={"cleanAuth": True},  # Request auth cleanup
            timeout=10
        )
        
        # Wait for process to fully terminate and clean up
        import time
        time.sleep(1.5)
        
        # Clear ALL WhatsApp state in database
        current_user.whatsapp_connected = False
        current_user.whatsapp_session_port = None
        current_user.whatsapp_qr_code = None
        current_user.whatsapp_pairing_code = None
        current_user.whatsapp_last_connected = None
        db.commit()
        
        print(f"✅ User {current_user.id} disconnected and cleaned")
        
        return {"success": True, "message": "WhatsApp disconnected and cleaned"}
        
    except Exception as e:
        db.rollback()
        print(f"❌ Disconnect error: {str(e)}")
        raise HTTPException(500, f"Failed to disconnect: {str(e)}")


@router.get("/status")
async def get_whatsapp_status(
    current_user: User = Depends(get_current_user)
):
    """
    Get WhatsApp connection status and QR code if available
    """
    try:
        # Always try to get QR code if user has whatsapp_connected = True
        if current_user.whatsapp_connected:
            # Try to get QR code directly
            try:
                qr_response = requests.get(
                    f"{SESSION_MANAGER_URL}/sessions/qr/{current_user.id}",
                    timeout=5
                )
                if qr_response.status_code == 200:
                    qr_data = qr_response.json()
                    if qr_data.get("qr"):
                        # QR code exists!
                        return {
                            "ready": qr_data.get("ready", False),
                            "qr_code": qr_data.get("qr"),
                            "expired": qr_data.get("expired", False),
                            "message": "Scan QR code to connect",
                            "port": current_user.whatsapp_session_port
                        }
            except:
                pass
            
            # No QR code, check session status
            try:
                response = requests.get(
                    f"{SESSION_MANAGER_URL}/sessions/status/{current_user.id}",
                    timeout=5
                )
                
                if response.status_code == 200:
                    session_data = response.json()
                    
                    # SELF-HEALING: If Session Manager says inactive, update DB!
                    if not session_data.get("active", False):
                        print(f"⚠️ Mismatch detected: DB says connected, Session Manager says inactive. Auto-correcting for user {current_user.id}...")
                        current_user.whatsapp_connected = False
                        current_user.whatsapp_session_port = None
                        db.commit()
                        
                        return {
                            "connected": False,
                            "ready": False,
                            "message": "Session expired. Please reconnect."
                        }

                    return {
                        "ready": session_data.get("ready", False),
                        "connected": True,
                        "active": session_data.get("active", False),
                        "port": current_user.whatsapp_session_port,
                        "status": session_data.get("status"),
                        "message": "Connected" if session_data.get("ready") else "Connecting..."
                    }
            except Exception as e:
                print(f"⚠️ Status check warning: {e}")
                pass
        
        # Not connected
        return {
            "connected": False,
            "ready": False,
            "message": "WhatsApp not connected. Click 'QR Code' to start."
        }
        
    except Exception as e:
        raise HTTPException(500, f"Failed to get status: {str(e)}")


@router.get("/qr")
async def get_qr_code(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get QR code for WhatsApp linking
    """
    try:
        if not current_user.whatsapp_connected:
            raise HTTPException(400, "Start session first")

        response = requests.get(
            f"{SESSION_MANAGER_URL}/sessions/qr/{current_user.id}",
            timeout=5
        )
        
        if response.status_code != 200:
            raise HTTPException(404, "QR code not available")
        
        data = response.json()
        
        if data.get("qr"):
            current_user.whatsapp_qr_code = data["qr"]
            db.commit()
        
        return data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to get QR: {str(e)}")


@router.post("/pairing-code")
async def generate_pairing_code(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate pairing code for WhatsApp linking
    Auto-starts session if not already connected
    """
    try:
        # Auto-start session if not connected
        if not current_user.whatsapp_connected:
            print(f"🔄 Auto-starting session for user {current_user.id}")
            
            # Clean phone number (remove + and spaces)
            clean_phone = current_user.phone_number.replace('+', '').replace(' ', '').replace('-', '') if current_user.phone_number else None
            
            start_response = requests.post(
                f"{SESSION_MANAGER_URL}/sessions/start/{current_user.id}",
                json={"phone_number": clean_phone},  # Pass cleaned phone number
                timeout=10
            )
            
            if start_response.status_code == 200:
                data = start_response.json()
                current_user.whatsapp_connected = True
                current_user.whatsapp_session_port = data.get("port")
                db.commit()
                print(f"✅ Session started on port {data.get('port')}")
                
                # Wait 4 seconds for pairing code to be generated
                import time
                print("⏳ Waiting 4 seconds for pairing code generation...")
                time.sleep(4)
            else:
                raise HTTPException(500, "Failed to start WhatsApp session")
        else:
            # Session exists but might have expired pairing code
            # Restart session to get fresh pairing code
            print(f"🔄 Restarting session for user {current_user.id} to get fresh pairing code")
            
            # Stop existing session
            try:
                requests.post(
                    f"{SESSION_MANAGER_URL}/sessions/stop/{current_user.id}",
                    timeout=5
                )
            except:
                pass
            
            # Clean phone number
            clean_phone = current_user.phone_number.replace('+', '').replace(' ', '').replace('-', '') if current_user.phone_number else None
            
            # Start new session
            start_response = requests.post(
                f"{SESSION_MANAGER_URL}/sessions/start/{current_user.id}",
                json={"phone_number": clean_phone},
                timeout=10
            )
            
            if start_response.status_code == 200:
                data = start_response.json()
                current_user.whatsapp_session_port = data.get("port")
                db.commit()
                print(f"✅ Session restarted on port {data.get('port')}")
                
                # Wait 4 seconds for pairing code to be generated
                import time
                print("⏳ Waiting 4 seconds for pairing code generation...")
                time.sleep(4)
            else:
                raise HTTPException(500, "Failed to restart WhatsApp session")

        # Generate pairing code
        response = requests.post(
            f"{SESSION_MANAGER_URL}/sessions/pairing/{current_user.id}",
            timeout=5
        )
        
        print(f"📡 Pairing code response status: {response.status_code}")
        print(f"📡 Pairing code response: {response.text}")
        
        if response.status_code != 200:
            raise HTTPException(500, f"Failed to generate pairing code: {response.text}")
        
        data = response.json()
        
        if data.get("code"):
            current_user.whatsapp_pairing_code = data["code"]
            db.commit()
        
        return data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Pairing code error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Failed to generate code: {str(e)}")


from pydantic import BaseModel

class SessionEndSchema(BaseModel):
    user_id: int
    exit_code: Optional[int] = None
    reason: Optional[str] = None

@router.post("/session-ended")
async def session_ended(
    payload: SessionEndSchema,
    db: Session = Depends(get_db)
):
    """
    Called by session manager when process dies
    """
    try:
        user_id = payload.user_id
        reason = payload.reason

        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(404, "User not found")
        
        user.whatsapp_connected = False
        user.whatsapp_session_port = None
        user.whatsapp_qr_code = None
        user.whatsapp_pairing_code = None
        db.commit()
        
        print(f"📊 User {user_id} session ended. Reason: {reason}")
        
        return {"success": True}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))



class StatusUpdateSchema(BaseModel):
    user_id: int
    ready: bool
    message: Optional[str] = None
    qr_code: Optional[str] = None
    pairing_code: Optional[str] = None
    expired: bool = False

@router.post("/update-status")
async def update_whatsapp_status(
    payload: StatusUpdateSchema,
    db: Session = Depends(get_db)
):
    """
    Called by user WhatsApp services to update status
    """
    try:
        user_id = payload.user_id
        ready = payload.ready
        message = payload.message
        qr_code = payload.qr_code
        pairing_code = payload.pairing_code
        expired = payload.expired

        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(404, "User not found")
        
        if ready:
            user.whatsapp_connected = True
            user.whatsapp_last_connected = datetime.utcnow()
        
        if qr_code:
            user.whatsapp_qr_code = qr_code
        
        if pairing_code:
            user.whatsapp_pairing_code = pairing_code
        
        if expired:
            user.whatsapp_qr_code = None
            user.whatsapp_pairing_code = None
        
        db.commit()
        
        # 🔔 NEW: Send Push Notification if disconnected
        if (ready is False or expired is True) and user.push_token:
            from ..services.notification_service import send_expo_push_notification
            
            # Determine suitable message
            alert_title = "WhatsApp Disconnected ⚠️"
            alert_body = "Connection lost. Tap to reconnect and resume analysis."
            
            if expired:
                alert_title = "WhatsApp Session Expired 🛑"
                alert_body = "Your session has expired. Please re-scan the QR code."

            # We use BackgroundTasks usually, but here we can just await it since this is async
            # Better to not block the session manager response too long, but it's fine for now
            await send_expo_push_notification(
                push_token=user.push_token,
                title=alert_title,
                body=alert_body,
                priority="high",
                data={"type": "whatsapp_disconnect", "action": "reconnect"}
            )
            print(f"🔔 Sent disconnection alert to User {user.id}")
        
        return {"success": True}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))


@router.post("/sync-groups")
async def sync_groups_from_whatsapp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch current WhatsApp groups from session manager and sync with database
    Marks deleted groups as inactive
    """
    try:
        if not current_user.whatsapp_connected:
            raise HTTPException(400, "WhatsApp not connected")
        
        # Get current groups from session manager
        print(f"📡 Fetching groups from WhatsApp for user {current_user.id}...")
        response = requests.get(
            f"{SESSION_MANAGER_URL}/sessions/{current_user.id}/groups",
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(500, "Failed to fetch groups from WhatsApp")
        
        whatsapp_groups = response.json().get("groups", [])
        print(f"📊 Found {len(whatsapp_groups)} groups in WhatsApp")
        
        # Import Group model
        from ..models import Group, GroupMember
        
        # Get current WhatsApp group IDs
        current_whatsapp_ids = [g.get("id") for g in whatsapp_groups if g.get("id")]
        
        # Mark groups as inactive if they're no longer in WhatsApp
        user_groups = db.query(Group).join(GroupMember).filter(
            GroupMember.user_id == current_user.id
        ).all()
        
        deactivated_count = 0
        for group in user_groups:
            if group.whatsapp_id not in current_whatsapp_ids and group.is_active:
                group.is_active = False
                deactivated_count += 1
        
        # Process current WhatsApp groups
        created_count = 0
        updated_count = 0
        
        for group_data in whatsapp_groups:
            whatsapp_id = group_data.get("id")
            name = group_data.get("subject") or group_data.get("name", "Unknown Group")
            
            if not whatsapp_id:
                continue
            
            # Check if group exists
            existing_group = db.query(Group).filter(
                Group.whatsapp_id == whatsapp_id
            ).first()
            
            if existing_group:
                # Update name if changed
                if existing_group.name != name:
                    existing_group.name = name
                    updated_count += 1
                # Reactivate if it was inactive
                if not existing_group.is_active:
                    existing_group.is_active = True
                    updated_count += 1
                group = existing_group
            else:
                # Create new group
                new_group = Group(
                    name=name,
                    whatsapp_id=whatsapp_id,
                    is_selected=0,
                    is_active=True,
                    user_id=current_user.id
                )
                db.add(new_group)
                db.commit()
                db.refresh(new_group)
                group = new_group
                created_count += 1
            
            # Ensure user membership
            membership = db.query(GroupMember).filter(
                GroupMember.user_id == current_user.id,
                GroupMember.group_id == group.id
            ).first()
            
            if not membership:
                new_membership = GroupMember(
                    user_id=current_user.id,
                    group_id=group.id
                )
                db.add(new_membership)
        
        db.commit()
        
        print(f"✅ Sync complete: {created_count} created, {updated_count} updated, {deactivated_count} deactivated")
        
        return {
            "success": True,
            "count": len(whatsapp_groups),
            "created": created_count,
            "updated": updated_count,
            "deactivated": deactivated_count,
            "message": f"Synced {len(whatsapp_groups)} groups"
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(503, f"Session manager unavailable: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Failed to sync groups: {str(e)}")
