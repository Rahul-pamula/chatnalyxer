from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models import User, EmailCredential, AnalyzedMessage
from ..deps import get_current_user
from ..services.email_service import email_service
from ..services.ai_analyzer import ai_analyzer
import logging

router = APIRouter(prefix="/email", tags=["Email"])
logger = logging.getLogger(__name__)

class EmailLinkRequest(BaseModel):
    email: str
    password: str # App Password
    provider: str = "gmail"

class EmailLinkResponse(BaseModel):
    status: str
    message: str

def process_emails_background(user_id: int, cred_id: int, db: Session):
    """Background task to fetch and analyze emails"""
    try:
        cred = db.query(EmailCredential).filter(EmailCredential.id == cred_id).first()
        if not cred:
            return

        # Fetch emails
        emails = email_service.connect_and_fetch(cred.email_address, cred.app_password, limit=10)
        
        for email_data in emails:
            # Check if exists
            exists = db.query(AnalyzedMessage).filter(
                AnalyzedMessage.email_id == email_data['id'],
                AnalyzedMessage.user_id == user_id
            ).first()
            
            if exists:
                continue

            # Analyze with Azure AI
            # Combine subject and body for analysis
            full_content = f"Subject: {email_data['subject']}\n\n{email_data['body']}"
            
            analysis = ai_analyzer.analyze_text_message(full_content, created_at=datetime.now()) # use email date in prod
            
            # Save to DB
            new_msg = AnalyzedMessage(
                user_id=user_id,
                message_id=email_data['id'], # Use email ID
                email_id=email_data['id'],
                sender_name=email_data['sender'],
                group_name="Inbox", # Virtual group for emails
                message_type="email",
                original_content=email_data['body'][:3000], # Truncate if too long
                subject=email_data['subject'],
                source="email",
                
                # AI Results
                priority=analysis['priority_level'],
                category=analysis['message_category'],
                ai_summary=analysis.get('academic_context', {}).get('summary', ''),
                is_important=bool(analysis['is_priority']),
                action_items=analysis.get('academic_context', {}).get('tasks', []),
                deadline=analysis.get('deadline_extracted')
            )
            db.add(new_msg)
        
        db.commit()
    except Exception as e:
        logger.error(f"Background email sync failed: {e}")
        # db.rollback() # handled by context usually

@router.post("/link", response_model=EmailLinkResponse)
def link_email(
    request: EmailLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Link an email account using App Password"""
    # Simply check connection first
    try:
        # Basic verify
        email_service.connect_and_fetch(request.email, request.password, limit=1)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}. Check your email and App Password.")

    # Save credential
    existing = db.query(EmailCredential).filter(
        EmailCredential.user_id == current_user.id, 
        EmailCredential.email_address == request.email
    ).first()

    if existing:
        existing.app_password = request.password
        cred_id = existing.id
    else:
        new_cred = EmailCredential(
            user_id=current_user.id,
            email_address=request.email,
            app_password=request.password,
            provider=request.provider
        )
        db.add(new_cred)
        db.commit()
        db.refresh(new_cred)
        cred_id = new_cred.id
    
    # Trigger initial sync
    background_tasks.add_task(process_emails_background, current_user.id, cred_id, db)

    return {"status": "success", "message": "Email linked successfully. Syncing recent emails..."}

@router.get("/status")
def get_email_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    creds = db.query(EmailCredential).filter(EmailCredential.user_id == current_user.id).all()
    return [{"email": c.email_address, "active": c.is_active, "provider": c.provider} for c in creds]
