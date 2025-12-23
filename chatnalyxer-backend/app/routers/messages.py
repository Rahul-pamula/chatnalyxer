from fastapi import APIRouter, Depends, Header, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app import models, schemas, utils
from app.database import get_db
from app.deps import get_current_user
from app.utils import get_ist_now
router = APIRouter(prefix="/messages", tags=["Messages"])

# Enable ML analyzer for priority detection
try:
    from app.services.ml_analyzer import analyzer as ml_analyzer
    print("ML analyzer loaded successfully - priority detection enabled")
except ImportError as e:
    ml_analyzer = None
    print(f"WARNING: ML analyzer import failed: {e} - using fallback values")

# Import Hybrid AI Analyzer (Gemini + Azure)
try:
    from ..services.ai_analyzer import ai_analyzer
    print("✅ Hybrid AI Analyzer loaded successfully")
except ImportError as e:
    ai_analyzer = None
    print(f"⚠️ AI Analyzer import failed: {e}")

# Dependency to check API Key for unauthenticated routes


def get_api_key(x_api_key: str = Header(...)):
    if x_api_key != "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")


@router.post("/from-whatsapp", response_model=schemas.MessageOut, status_code=status.HTTP_201_CREATED)
def create_whatsapp_message(
    payload: schemas.WhatsAppMessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    api_key_check: str = Depends(get_api_key)
):
    # NEW: Check if user is connected
    user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User {payload.user_id} not found")
    
    if not user.whatsapp_connected:
        raise HTTPException(
            status_code=400, 
            detail=f"User {payload.user_id} WhatsApp not connected. Messages will not be processed."
        )
    
    # Find the group by WhatsApp ID
    group = db.query(models.Group).filter(
        models.Group.whatsapp_id == payload.group_id).first()
    if not group:
        raise HTTPException(
            status_code=404, detail=f"Group with WhatsApp ID {payload.group_id} not found")

    # Create or get default user for WhatsApp messages
    default_user = db.query(models.User).filter(
        models.User.email == "whatsapp@chatnalyxer.com").first()
    if not default_user:
        # Create a default user for WhatsApp messages
        default_user = models.User(
            username="whatsapp_user",
            email="whatsapp@chatnalyxer.com",
            hashed_password="dummy_hash",
            phone_number="0000000000",
            is_verified=1
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    # 🔍 PRE-CHECK REMOVED: All messages are now sent to AI Analyzer.
    # This enables multilingual support (Telugu, Hindi, etc.) which simple keyword matching fails at.
    # Legacy check was: if ml_analyzer and ml_analyzer.is_casual_message(payload.content): ...

    # ✅ Message is important - analyze with AI
    ai_results = {
        'priority_level': 'MEDIUM',
        'urgency_score': 0.5,
        'deadline_extracted': None,
        'extracted_keywords': '[]',
        'is_priority': 0,
        'message_category': 'GENERAL',
        'academic_context': '{}'
    }

    if ai_analyzer:
        try:
            # 🧠 Few-Shot Learning: Fetch last 5 manual overrides
            # These are messages the user corrected, which helps the AI learn.
            user_examples = db.query(models.Message).filter(
                models.Message.is_manual_override == True,
                models.Message.deleted_at.is_(None)
            ).order_by(models.Message.created_at.desc()).limit(5).all()

            # Convert timestamp string to datetime if needed
            from datetime import datetime
            if isinstance(payload.timestamp, str):
                created_at = datetime.fromisoformat(payload.timestamp.replace('Z', '+00:00'))
            else:
                created_at = payload.timestamp

            # Get user profile to determine user type (STUDENT/CASUAL/PROFESSIONAL)
            user_profile = db.query(models.UserProfile).filter(
                models.UserProfile.user_id == payload.user_id
            ).first()
            user_type = user_profile.user_type if user_profile else "STUDENT"
            
            print(f"👤 Analyzing message for {user_type} user...")

            # Use hybrid analysis (Text + Image + User Feedback + User Context)
            ai_results = ai_analyzer.analyze_message_with_media(
                content=payload.content,
                created_at=created_at,  # Now a datetime object
                user_type=user_type,  # NEW: User context for priority detection
                media_url=payload.media_url,
                user_examples=user_examples
            )
            print(f"🤖 AI Analysis Result: {ai_results['priority_level']} (for {user_type})")
        except Exception as e:
            print(f"WARNING: AI Analysis failed: {e}")
            # Fallback to ML analyzer if AI fails
            if ml_analyzer:
                ai_results = ml_analyzer.analyze_message(payload.content, payload.timestamp)
    elif ml_analyzer:
        # Fallback if AI analyzer not loaded
        ai_results = ml_analyzer.analyze_message(payload.content, payload.timestamp)

    msg = models.Message(
        content=payload.content,
        group_id=group.id,
        sender_id=default_user.id,
        created_at=get_ist_now(), # Use server time
        priority_level=ai_results['priority_level'],
        urgency_score=ai_results['urgency_score'],
        deadline_extracted=ai_results['deadline_extracted'],
        extracted_keywords=ai_results['extracted_keywords'],
        is_priority=ai_results['is_priority'],
        message_category=ai_results.get('message_category', 'GENERAL'),
        academic_context=ai_results.get('academic_context', '{}'),
        
        # RAG Fields (Legacy)
        media_url=payload.media_url,
        media_type=payload.media_type,
        extracted_text=None,
        
        # AI Memory System (NEW - Phase 1)
        extracted_content=payload.extracted_content,  # Full text from Azure AI
        ai_summary=None  # Will be generated below if extracted_content exists
    )
    
    # 📄 RAG Ingestion: Extract text from PDF/Images if present
    if payload.media_url and payload.media_type in ['document', 'image', 'pdf']:
        print(f"📄 Processing media for RAG: {payload.media_url} ({payload.media_type})")
        extracted_text = ""
        try:
            # 1. Handle PDF
            if payload.media_type in ['document', 'pdf'] or payload.media_url.lower().endswith('.pdf'):
                from ..services.pdf_processor import pdf_processor
                # If URL starts with http, download it
                if payload.media_url.startswith(('http://', 'https://')):
                    import requests
                    response = requests.get(payload.media_url)
                    if response.status_code == 200:
                        extracted_text = pdf_processor.extract_text_from_bytes(response.content)
                else:
                    # Assume local path (from whatsapp node service)
                    extracted_text = pdf_processor.extract_text_from_file(payload.media_url)
            
            # 2. Handle Image (OCR via Azure Vision)
            elif payload.media_type == 'image' and ai_analyzer:
                # Assuming ai_analyzer can take URL or path logic needs adjustment if path
                # For now, let's trust ai_analyzer.analyze_image handles URL
                # If local path, we might need to read bytes
                if payload.media_url.startswith(('http://', 'https://')):
                    img_analysis = ai_analyzer.analyze_image(image_url=payload.media_url)
                    extracted_text = img_analysis.get('ocr_text', '')
                else:
                    # Local image file
                    with open(payload.media_url, "rb") as img_file:
                        img_bytes = img_file.read()
                        img_analysis = ai_analyzer.analyze_image(image_url=None, image_data=img_bytes)
                        extracted_text = img_analysis.get('ocr_text', '')

            if extracted_text:
                print(f"✅ Extracted {len(extracted_text)} chars for RAG.")
                msg.extracted_text = extracted_text
                
        except Exception as e:
            print(f"⚠️ Failed to process media for RAG: {e}")

    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    # 🤖 Generate AI Summary for extracted content (NEW - Phase 1)
    if payload.extracted_content and ai_analyzer:
        try:
            import google.generativeai as genai
            import os
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
            model = genai.GenerativeModel('gemini-pro')
            
            prompt = f"""Generate a concise title (max 50 words) for this document:

{payload.extracted_content[:2000]}

Title:"""
            
            response = model.generate_content(prompt)
            ai_summary = response.text.strip()
            
            # Update message with AI summary
            msg.ai_summary = ai_summary
            db.commit()
            print(f"✨ Generated AI summary: {ai_summary}")
        except Exception as e:
            print(f"⚠️ Failed to generate AI summary: {e}")

    # Log priority message detection
    if ai_results['is_priority']:
        print(
            f"[PRIORITY] MESSAGE detected: {payload.content[:50]}... (Priority: {ai_results['priority_level']}, Score: {ai_results['urgency_score']:.2f})")
    else:
        print(f"💾 Saved important message: {payload.content[:50]}...")

    # Gemini AI background task REMOVED - not using Gemini anymore

    return msg


@router.post("", response_model=schemas.MessageOut)
async def create_message(
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    print("📩 New message:", payload.content, "from group:", payload.group_id)
    msg = models.Message(content=payload.content,
                         group_id=payload.group_id, sender_id=user.id)
    db.add(msg) # Changed from new_message to msg
    db.commit()
    db.refresh(msg) # Changed from new_message to msg

    # ✅ ANALYZE MESSAGE FOR EVENTS (Text, Images, PDFs)
    try:
        from ..services.event_detection import detect_events_from_text, create_events_from_detection
        
        # Determine what text to analyze
        text_to_analyze = payload.content
        
        # For images with captions or PDFs, use extracted text if available
        if msg.extracted_text: # Changed from new_message to msg
            text_to_analyze = msg.extracted_text # Changed from new_message to msg
        
        # Only analyze if there's meaningful content
        if text_to_analyze and len(text_to_analyze.strip()) > 10:
            logger.info(f"🔍 Analyzing message {msg.id} for events...") # Changed from new_message to msg
            
            # Get user profile for context
            user_type = "CASUAL"
            # In create_message, 'user' is the authenticated user, not 'default_user'
            if user and hasattr(user, 'user_profile') and user.user_profile:
                user_type = user.user_profile.user_type
            
            # Detect events
            events_data = await detect_events_from_text(text_to_analyze, user_type)
            
            # Create events if detected
            if events_data:
                created_events = await create_events_from_detection(
                    events_data,
                    user.id, # Changed from default_user.id to user.id
                    msg.id, # Changed from new_message.id to msg.id
                    db
                )
                logger.info(f"✅ Created {len(created_events)} events from message {msg.id}") # Changed from new_message to msg
    
    except Exception as e:
        logger.error(f"Event detection failed for message: {e}")
        # Continue anyway - message is saved

    return msg # Changed from new_message to msg


@router.get("", response_model=list[schemas.MessageOut])
def list_messages(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    # Get user's selected groups
    selected_group_ids = db.query(models.Group.id).join(models.GroupMember).filter(
        models.GroupMember.user_id == user.id,
        models.Group.is_selected == 1
    ).all()
    selected_group_ids = [g[0] for g in selected_group_ids]
    
    # Filter messages by selected groups and exclude LOW priority
    q = db.query(models.Message).filter(
        models.Message.deleted_at.is_(None),
        models.Message.group_id.in_(selected_group_ids) if selected_group_ids else False,
        models.Message.priority_level.in_(['CRITICAL', 'HIGH', 'MEDIUM'])  # Include CRITICAL priority
    )
    
    if group_id:
        q = q.filter(models.Message.group_id == group_id)
    
    messages = q.order_by(models.Message.created_at.desc()).limit(100).all()
    
    # Populate group_name and sender_name for each message
    for msg in messages:
        # Get group name
        group = db.query(models.Group).filter(models.Group.id == msg.group_id).first()
        msg.group_name = group.name if group else "Unknown Group"
        
        # Get sender name from sender relationship
        msg.sender_name = msg.sender.username if msg.sender else "Unknown"
    
    return messages


@router.get("/public", response_model=list[schemas.MessageOut])
def list_messages_public(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Public endpoint for testing - fetches messages without authentication"""
    q = db.query(models.Message).filter(models.Message.deleted_at.is_(None))
    if group_id:
        q = q.filter(models.Message.group_id == group_id)
    return q.order_by(models.Message.created_at.desc()).limit(100).all()


@router.get("/priority", response_model=list[schemas.MessageOut])
def list_priority_messages(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Get only priority messages based on ML analysis"""
    q = db.query(models.Message).filter(
        models.Message.is_priority == 1, models.Message.deleted_at.is_(None))
    if group_id:
        q = q.filter(models.Message.group_id == group_id)
    return q.order_by(models.Message.created_at.desc()).limit(100).all()


@router.get("/priority/public", response_model=list[schemas.MessageOut])
def list_priority_messages_public(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Get priority messages from user's groups only"""
    # Get user's group IDs for isolation
    user_group_ids = [g.group_id for g in user.groups]
    
    q = db.query(models.Message).filter(
        models.Message.is_priority == 1,
        models.Message.deleted_at.is_(None),
        models.Message.group_id.in_(user_group_ids)
    )
    if group_id:
        q = q.filter(models.Message.group_id == group_id)
    return q.order_by(models.Message.created_at.desc()).limit(100).all()


@router.get("/analytics")
def get_message_analytics(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Get ML analytics data for visualization dashboard"""
    q = db.query(models.Message).filter(models.Message.deleted_at.is_(None))
    if group_id:
        q = q.filter(models.Message.group_id == group_id)

    messages = q.all()

    # Convert to dict format for analytics
    message_dicts = []
    for msg in messages:
        message_dicts.append({
            'priority_level': msg.priority_level,
            'urgency_score': msg.urgency_score,
            'deadline_extracted': msg.deadline_extracted,
            'extracted_keywords': msg.extracted_keywords,
            'is_priority': msg.is_priority,
            'message_category': getattr(msg, 'message_category', 'GENERAL'),
            'academic_context': getattr(msg, 'academic_context', '{}')
        })

    if ml_analyzer:
        analytics_data = ml_analyzer.get_analytics_data(message_dicts)
    else:
        # Fallback analytics when ML analyzer is not available
        analytics_data = {
            'total_messages': len(message_dicts),
            'priority_distribution': {'HIGH': 0, 'MEDIUM': len(message_dicts), 'LOW': 0},
            'urgency_score_avg': 0.5,
            'messages_with_deadlines': 0,
            'top_keywords': []
        }
    return analytics_data


@router.delete("/trash")
def empty_trash(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Permanently delete ALL messages in trash for user's groups"""
    user_group_ids = [g.group_id for g in user.groups]
    
    deleted_count = db.query(models.Message).filter(
        models.Message.group_id.in_(user_group_ids),
        models.Message.deleted_at.is_not(None)
    ).delete(synchronize_session=False)
    
    db.commit()
    return {"message": f"Trash emptied successfully ({deleted_count} messages deleted)"}


@router.delete("/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Soft delete a message by ID (only from user's groups)"""
    message = db.query(models.Message).filter(
        models.Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Security: Verify message belongs to user's group
    user_group_ids = [g.group_id for g in user.groups]
    if message.group_id not in user_group_ids:
        raise HTTPException(status_code=403, detail="Not authorized to delete this message")

    message.deleted_at = get_ist_now()
    db.commit()
    return {"message": "Message moved to trash successfully"}


@router.delete("")
def delete_all_messages(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Soft delete all messages from user's groups only"""
    user_group_ids = [g.group_id for g in user.groups]
    
    print(f"Moving all messages to trash for user {user.id}")
    db.query(models.Message).filter(
        models.Message.group_id.in_(user_group_ids)
    ).update({models.Message.deleted_at: get_ist_now()})
    db.commit()
    print(f"All messages from user {user.id}'s groups moved to trash")
    return {"message": "All messages moved to trash successfully"}





@router.get("/trash", response_model=list[schemas.MessageOut])
def list_trash_messages(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """List trashed messages for the user's groups"""
    # Get user's group IDs
    user_group_ids = [g.group_id for g in user.groups]
    
    # Filter deleted messages from user's groups
    q = db.query(models.Message).filter(
        models.Message.deleted_at.is_not(None),
        models.Message.group_id.in_(user_group_ids)
    )
    if group_id:
        q = q.filter(models.Message.group_id == group_id)
    return q.order_by(models.Message.deleted_at.desc()).limit(100).all()


@router.post("/{message_id}/restore", response_model=schemas.MessageOut)
def restore_message(
    message_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Restore a trashed message from user's groups"""
    user_group_ids = [g.group_id for g in user.groups]
    
    message = db.query(models.Message).filter(
        models.Message.id == message_id,
        models.Message.group_id.in_(user_group_ids),
        models.Message.deleted_at.is_not(None)
    ).first()
    if not message:
        raise HTTPException(
            status_code=404, detail="Message not found in trash")

    message.deleted_at = None
    db.commit()
    db.refresh(message)
    return message


@router.delete("/{message_id}/permanent")
def permanent_delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Permanently delete a trashed message from user's groups"""
    user_group_ids = [g.group_id for g in user.groups]
    
    message = db.query(models.Message).filter(
        models.Message.id == message_id,
        models.Message.group_id.in_(user_group_ids),
        models.Message.deleted_at.is_not(None)
    ).first()
    if not message:
        raise HTTPException(
            status_code=404, detail="Message not found in trash")

    db.delete(message)
    db.commit()
    return {"message": "Message permanently deleted"}


@router.post("/{message_id}/toggle-priority", response_model=schemas.MessageOut)
def toggle_message_priority(
    message_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """
    Feedback Loop: User toggles priority. 
    This trains the system by marking the message as a 'manual override'.
    """
    # Verify user has access to this message
    user_group_ids = [g.group_id for g in user.groups]
    
    message = db.query(models.Message).filter(
        models.Message.id == message_id,
        models.Message.group_id.in_(user_group_ids)
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Toggle Priority
    # If currently priority (1), make it normal (0)
    # If normal (0), make it priority (1)
    new_priority = 0 if message.is_priority else 1
    
    message.is_priority = new_priority
    message.is_manual_override = True  # Mark as training example
    
    # Update text label for consistency
    message.priority_level = "HIGH" if new_priority == 1 else "LOW"
    
    db.commit()
    db.refresh(message)
    
    print(f"🔄 Feedback: Message {message_id} toggled to Priority={new_priority} (Manual Override)")
    return message


@router.get("/analytics/public")
def get_message_analytics_public(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Public endpoint for analytics data - for dashboard"""
    q = db.query(models.Message).filter(models.Message.deleted_at.is_(None))
    if group_id:
        q = q.filter(models.Message.group_id == group_id)

    messages = q.all()

    # Convert to dict format for analytics
    message_dicts = []
    for msg in messages:
        message_dicts.append({
            'priority_level': msg.priority_level,
            'urgency_score': msg.urgency_score,
            'deadline_extracted': msg.deadline_extracted,
            'extracted_keywords': msg.extracted_keywords,
            'is_priority': msg.is_priority,
            'message_category': getattr(msg, 'message_category', 'GENERAL'),
            'academic_context': getattr(msg, 'academic_context', '{}')
        })

    if ml_analyzer:
        analytics_data = ml_analyzer.get_analytics_data(message_dicts)
    else:
        # Fallback analytics when ML analyzer is not available
        analytics_data = {
            'total_messages': len(message_dicts),
            'priority_distribution': {'HIGH': 0, 'MEDIUM': len(message_dicts), 'LOW': 0},
            'urgency_score_avg': 0.5,
            'messages_with_deadlines': 0,
            'top_keywords': []
        }
    return analytics_data
