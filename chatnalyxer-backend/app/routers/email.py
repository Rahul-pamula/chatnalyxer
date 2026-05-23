from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models import User, EmailCredential, AnalyzedMessage
from .. import schemas
from ..deps import get_current_user
from ..services.email_service import email_service
from ..services.ai_analyzer import ai_analyzer
import logging
from datetime import datetime
import json
from .consent import require_consent_for_email

router = APIRouter(prefix="/email", tags=["Email"])
logger = logging.getLogger(__name__)

class EmailLinkRequest(BaseModel):
    email: str
    password: str # App Password
    provider: str = "gmail"

class EmailLinkResponse(BaseModel):
    status: str
    message: str


def _should_skip_email(subject: str, sender: str, body: str) -> bool:
    subj = (subject or "").lower()
    snd = (sender or "").lower()
    if any(k in subj for k in [
        "sale", "discount", "offer", "off%", "cashback", "deal", "limited time",
        "newsletter", "unsubscribe", "promotion", "promotional", "order", "shipped",
        "delivered", "invoice", "receipt", "amazon", "flipkart", "myntra", "meesho",
        "swiggy", "zomato"
    ]):
        return True
    if any(k in snd for k in ["no-reply", "noreply", "donotreply", "do-not-reply"]):
        return True
    # If body is tiny or empty, skip
    if not (body or "").strip():
        return True
    return False


def process_emails_background(user_id: int, cred_id: int, db: Session):
    """Background task to fetch and analyze emails"""
    try:
        cred = db.query(EmailCredential).filter(EmailCredential.id == cred_id).first()
        if not cred:
            return

        # Fetch emails
        emails = email_service.connect_and_fetch(cred.email_address, cred.app_password, limit=10)
        
        for email_data in emails:
            if _should_skip_email(email_data.get('subject'), email_data.get('sender'), email_data.get('body')):
                continue

            # Check if exists
            exists = db.query(AnalyzedMessage).filter(
                AnalyzedMessage.message_id == email_data['id'],
                AnalyzedMessage.user_id == user_id
            ).first()
            
            if exists:
                continue

            # Analyze with Azure AI
            # Combine subject and body for analysis
            full_content = f"Subject: {email_data['subject']}\n\n{email_data['body']}"
            
            analysis = ai_analyzer.analyze_text_message(full_content, created_at=datetime.now())  # use email date in prod
            academic_context = {}
            try:
                academic_context = json.loads(analysis.get('academic_context') or "{}")
            except Exception:
                academic_context = {}
            
            # Save to DB
            new_msg = AnalyzedMessage(
                user_id=user_id,
                message_id=email_data['id'], # Use email ID
                sender_name=email_data['sender'],
                group_name="Inbox", # Virtual group for emails
                message_type="email",
                original_content=full_content[:3000], # Truncate if too long
                
                # AI Results
                priority=analysis.get('priority_level', 'LOW'),
                category=analysis.get('message_category', 'general'),
                ai_summary=analysis.get('ai_summary') or academic_context.get('summary', ''),
                is_important=bool(analysis.get('is_priority')),
                action_items=academic_context.get('tasks', []),
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
    require_consent_for_email(current_user)

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


@router.post("/sync")
def sync_email_now(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Manually trigger an email sync for all active linked accounts."""
    require_consent_for_email(current_user)

    creds = db.query(EmailCredential).filter(
        EmailCredential.user_id == current_user.id,
        EmailCredential.is_active == True
    ).all()
    for cred in creds:
        background_tasks.add_task(process_emails_background, current_user.id, cred.id, db)
    return {"status": "queued", "accounts": len(creds)}


@router.get("/important", response_model=List[schemas.AnalyzedMessageOut])
def get_important_emails(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Return important analyzed email items for dashboard."""
    require_consent_for_email(current_user)

    items = db.query(AnalyzedMessage).filter(
        AnalyzedMessage.user_id == current_user.id,
        AnalyzedMessage.message_type == "email",
        AnalyzedMessage.is_important == True
    ).order_by(AnalyzedMessage.created_at.desc()).limit(limit).all()
    return items

@router.get("/status")
def get_email_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_consent_for_email(current_user)
    creds = db.query(EmailCredential).filter(EmailCredential.user_id == current_user.id).all()
    return [{"email": c.email_address, "active": c.is_active, "provider": c.provider} for c in creds]
