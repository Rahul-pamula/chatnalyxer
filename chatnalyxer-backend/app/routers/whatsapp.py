from fastapi import APIRouter, HTTPException
import subprocess
import os

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

whatsapp_status = {"message": "", "ready": False}


@router.post("/status")
def set_whatsapp_status(status: dict):
    global whatsapp_status
    whatsapp_status = status
    return {"message": "Status updated"}


@router.get("/status")
def get_whatsapp_status():
    return whatsapp_status


@router.post("/start")
def start_whatsapp():
    try:
        # Path to whatsapp-integration directory
        whatsapp_dir = os.path.join(os.path.dirname(os.path.dirname(
            os.path.dirname(os.path.dirname(__file__)))), "whatsapp-integration")
        # Start node index.js
        subprocess.Popen(["node", "index.js"], cwd=whatsapp_dir)
        return {"message": "WhatsApp integration started"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start WhatsApp: {str(e)}")
