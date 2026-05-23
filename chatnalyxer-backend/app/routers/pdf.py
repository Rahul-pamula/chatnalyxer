from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Header
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from .. import models
from ..services.pdf_service import extract_pdf_text, is_pdf_file
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pdf", tags=["PDF"])

@router.post("/analyze")
async def analyze_pdf(
    file: UploadFile = File(...),
    message_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    api_key: Optional[str] = Header(None, alias="x-api-key")
):
    """
    Analyze a PDF file and extract text content.
    Can be called with API key (WhatsApp integration) or without auth for testing.
    """
    try:
        # Validate file type
        if not is_pdf_file(file.filename):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Read PDF bytes
        pdf_bytes = await file.read()
        
        # Extract text
        extracted_text = await extract_pdf_text(pdf_bytes)
        
        if not extracted_text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Detect events from extracted text
        detected_events = []
        try:
            from ..services.event_detection import detect_events_from_text, create_events_from_detection
            
            # Get user info for context (if message_id provided)
            user_type = "CASUAL"
            user_id = None
            
            if message_id:
                message = db.query(models.Message).filter(
                    models.Message.id == message_id
                ).first()
                
                if message:
                    # Update message with extracted text
                    message.extracted_text = extracted_text
                    user_id = message.sender_id
                    
                    # Get user profile for context
                    user = db.query(models.User).filter(models.User.id == user_id).first()
                    if user and hasattr(user, 'user_profile') and user.user_profile:
                        user_type = user.user_profile.user_type
            
            # Detect events using AI
            logger.info(f"Detecting events from PDF text ({len(extracted_text)} chars)...")
            events_data = await detect_events_from_text(extracted_text, user_type)
            
            # Create events in database if user_id available
            if events_data and user_id:
                created_events = await create_events_from_detection(
                    events_data,
                    user_id,
                    message_id,
                    db
                )
                detected_events = [
                    {
                        "id": e.id,
                        "title": e.title,
                        "date": str(e.event_date),
                        "time": str(e.event_time) if e.event_time else None
                    }
                    for e in created_events
                ]
                logger.info(f"Created {len(detected_events)} events from PDF")
            
        except Exception as e:
            logger.error(f"Event detection failed: {e}")
            # Continue anyway - PDF text extraction succeeded
        
        return {
            "success": True,
            "filename": file.filename,
            "extracted_text": extracted_text,
            "text_length": len(extracted_text),
            "message_id": message_id,
            "events_detected": len(detected_events),
            "events": detected_events
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF analysis failed: {str(e)}")
