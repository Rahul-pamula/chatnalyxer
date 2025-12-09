"""
OTP Service - Handle OTP generation, storage, and verification
"""
import random
import string
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app import models

# Configuration
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
MAX_OTP_ATTEMPTS = 3

# Rate limiting - configurable via environment variables
# For testing: set high limits. For production: use strict limits.
RATE_LIMIT_REQUESTS = int(os.getenv('OTP_RATE_LIMIT_REQUESTS', '100'))  # Default: 100 requests (testing mode)
RATE_LIMIT_WINDOW_MINUTES = int(os.getenv('OTP_RATE_LIMIT_WINDOW_MINUTES', '60'))  # Default: 60 minutes

# Production recommended values:
# OTP_RATE_LIMIT_REQUESTS=3
# OTP_RATE_LIMIT_WINDOW_MINUTES=60


def generate_otp() -> str:
    """Generate a random 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=OTP_LENGTH))


def create_otp_record(db: Session, phone_number: str) -> tuple[str, datetime]:
    """
    Create OTP record in database
    Returns: (otp_code, expires_at)
    """
    # Generate OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    # Create OTP record
    otp_record = models.OTP(
        phone_number=phone_number,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=0,
        attempts=0
    )
    
    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)
    
    return otp_code, expires_at


def verify_otp(db: Session, phone_number: str, otp_code: str) -> tuple[bool, str]:
    """
    Verify OTP code
    Returns: (is_valid, error_message)
    """
    # Find the most recent unused OTP for this phone number
    otp_record = db.query(models.OTP).filter(
        and_(
            models.OTP.phone_number == phone_number,
            models.OTP.otp_code == otp_code,
            models.OTP.is_used == 0
        )
    ).order_by(models.OTP.created_at.desc()).first()
    
    if not otp_record:
        return False, "Invalid OTP code"
    
    # Check if OTP has expired
    now = datetime.utcnow()
    if otp_record.expires_at.tzinfo:
        from datetime import timezone
        now = now.replace(tzinfo=timezone.utc)
        
    if now > otp_record.expires_at:
        return False, "OTP has expired"
    
    # Check if max attempts exceeded
    if otp_record.attempts >= MAX_OTP_ATTEMPTS:
        return False, "Maximum verification attempts exceeded"
    
    # Increment attempts
    otp_record.attempts += 1
    
    # Mark as used if valid
    otp_record.is_used = 1
    db.commit()
    
    return True, "OTP verified successfully"


def check_rate_limit(db: Session, phone_number: str) -> tuple[bool, str]:
    """
    Check if phone number has exceeded rate limit
    Returns: (is_allowed, error_message)
    """
    # Check how many OTPs were sent in the last hour
    time_window = datetime.utcnow() - timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)
    
    recent_otps = db.query(models.OTP).filter(
        and_(
            models.OTP.phone_number == phone_number,
            models.OTP.created_at >= time_window
        )
    ).count()
    
    if recent_otps >= RATE_LIMIT_REQUESTS:
        return False, f"Too many OTP requests. Please try again after {RATE_LIMIT_WINDOW_MINUTES} minutes"
    
    return True, ""


def cleanup_expired_otps(db: Session) -> int:
    """
    Remove expired OTPs from database
    Returns: number of deleted records
    """
    deleted = db.query(models.OTP).filter(
        models.OTP.expires_at < datetime.utcnow()
    ).delete()
    
    db.commit()
    return deleted


def invalidate_previous_otps(db: Session, phone_number: str):
    """Mark all previous OTPs for this phone number as used"""
    db.query(models.OTP).filter(
        and_(
            models.OTP.phone_number == phone_number,
            models.OTP.is_used == 0
        )
    ).update({"is_used": 1})
    db.commit()
