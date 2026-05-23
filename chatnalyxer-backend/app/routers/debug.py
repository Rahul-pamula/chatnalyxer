from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..utils import hash_password

router = APIRouter(prefix="/debug", tags=["Debug"])

@router.post("/update-phone/{user_id}/{phone_number}")
def update_phone(user_id: int, phone_number: str, db: Session = Depends(get_db)):
    """Quick endpoint to update user phone number"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}
    
    old_phone = user.phone_number
    user.phone_number = phone_number
    db.commit()
    
    return {
        "success": True,
        "user_id": user_id,
        "old_phone": old_phone,
        "new_phone": phone_number
    }

@router.post("/reset-password/{phone_number}/{new_password}")
def reset_password(phone_number: str, new_password: str, db: Session = Depends(get_db)):
    """Quick endpoint to reset user password"""
    user = db.query(User).filter(User.phone_number == phone_number).first()
    if not user:
        return {"error": "User not found"}
    
    user.password = hash_password(new_password)
    db.commit()
    
    return {
        "success": True,
        "user_id": user.id,
        "username": user.username,
        "phone_number": phone_number,
        "message": "Password updated successfully"
    }
