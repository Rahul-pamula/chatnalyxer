from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from .. import schemas, models, utils
from ..database import get_db
from ..services import otp_service, whatsapp_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/request-otp", status_code=status.HTTP_200_OK)
def request_otp(
    request: schemas.OTPRequest,
    db: Session = Depends(get_db)
):
    """
    Request OTP for phone number
    - Creates user if first time
    - Sends OTP via WhatsApp
    """
    # Check rate limit
    is_allowed, error_msg = otp_service.check_rate_limit(db, request.phone_number)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_msg
        )
    
    # Check if user exists
    user = db.query(models.User).filter(
        models.User.phone_number == request.phone_number
    ).first()
    
    # If user doesn't exist, check if username is taken
    if not user:
        existing_username = db.query(models.User).filter(
            models.User.username == request.username
        ).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Invalidate any previous OTPs for this phone number
    otp_service.invalidate_previous_otps(db, request.phone_number)
    
    # Generate and store OTP
    otp_code, expires_at = otp_service.create_otp_record(db, request.phone_number)
    
    # Send OTP via WhatsApp
    success, error_msg = whatsapp_service.send_otp_message(request.phone_number, otp_code)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to send OTP: {error_msg}"
        )
    
    return {
        "message": "OTP sent successfully",
        "expires_in": otp_service.OTP_EXPIRY_MINUTES * 60,  # seconds
        "phone_number": request.phone_number
    }


@router.post("/verify-otp", response_model=schemas.AuthResponse)
def verify_otp(
    request: schemas.OTPVerify,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Verify OTP and login/register user
    - Validates OTP
    - Creates user if first time
    - Returns JWT token
    """
    # Verify OTP
    print(f"DEBUG: Verifying OTP for {request.phone_number} Code: {request.otp_code}")
    is_valid, error_msg = otp_service.verify_otp(db, request.phone_number, request.otp_code)
    print(f"DEBUG: Validation result: {is_valid}, Msg: {error_msg}")
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_msg
        )
    
    # Find or create user
    user = db.query(models.User).filter(
        models.User.phone_number == request.phone_number
    ).first()
    
    if not user:
        print("DEBUG: User not found after OTP verify")
        # Get username from the OTP request (we need to store it temporarily)
        # For now, we'll use phone number as username if not provided
        # This is a limitation - ideally we'd store username with OTP request
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found. Please request OTP again with username."
        )
    
    # Mark user as verified
    if user.is_verified == 0:
        print("DEBUG: Marking user as verified")
        user.is_verified = 1
        db.commit()
        db.refresh(user)
        
        # Send welcome message (background task)
        background_tasks.add_task(whatsapp_service.send_welcome_message, user.phone_number, user.username)
    
    # Generate JWT token
    token = utils.create_access_token(data={"sub": user.username})
    print(f"DEBUG: Token generated for {user.username}")
    
    return {"token": token, "user": user}


@router.post("/login", response_model=schemas.AuthResponse)
def login(
    request: schemas.UserLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login with phone and password
    """
    user = db.query(models.User).filter(
        models.User.phone_number == request.phone_number
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password login not set up. Please use OTP."
        )

    if not utils.verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Generate token
    token = utils.create_access_token(data={"sub": user.username})
    return {"token": token, "user": user}


@router.post("/register-and-request-otp", status_code=status.HTTP_200_OK)
def register_and_request_otp(
    request: schemas.UserRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Combined endpoint: Register user and request OTP
    - Creates user record immediately with password
    - Sends OTP for verification
    """
    # Check if phone number already exists
    existing_phone = db.query(models.User).filter(
        models.User.phone_number == request.phone_number
    ).first()
    
    if existing_phone:
        # User exists
        if existing_phone.is_verified:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists. Please login."
            )
        else:
             # User exists but not verified, update details and resend OTP
             existing_phone.hashed_password = utils.hash_password(request.password)
             existing_phone.email = request.email
             existing_phone.username = request.username # Allow updating username if unverified
             db.commit()
             # Fall through to send OTP logic below
             # convert to OTPRequest for the helper function
             otp_req = schemas.OTPRequest(username=request.username, phone_number=request.phone_number)
             return request_otp(otp_req, db)

    
    # Check if username is taken
    existing_username = db.query(models.User).filter(
        models.User.username == request.username
    ).first()
    
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create user (unverified)
    new_user = models.User(
        username=request.username,
        phone_number=request.phone_number,
        is_verified=0,
        email=request.email,
        hashed_password=utils.hash_password(request.password)
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Now request OTP
    otp_req = schemas.OTPRequest(username=request.username, phone_number=request.phone_number)
    return request_otp(otp_req, db)


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    request: schemas.PasswordReset,
    db: Session = Depends(get_db)
):
    """
    Reset password using OTP
    """
    # Verify OTP first
    is_valid, error_msg = otp_service.verify_otp(db, request.phone_number, request.otp_code)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_msg
        )
    
    # Get user
    user = db.query(models.User).filter(
        models.User.phone_number == request.phone_number
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = utils.hash_password(request.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}
