from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user
from ..services.ai_analyzer import ai_analyzer
import google.generativeai as genai
import os
from datetime import datetime, timedelta

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/analyze-message", response_model=schemas.AnalyzedMessageOut)
def analyze_message(
    request: schemas.AIAnalysisRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze a message with Gemini AI"""
    try:
        # Convert Pydantic to dict
        message_data = request.model_dump()
        
        analysis = ai_analyzer.analyze_message(
            user_id=current_user.id,
            message_data=message_data,
            db=db
        )
        # analysis is a dict, need to return the stored DB object or convert dict to schema
        # Since analyze_message returns dict but also stores to DB, let's query the latest one or reconstruct
        # Easier: ai_analyzer._store_analysis returns the DB object, let's update ai_analyzer to return that if possible
        # Or just return the analysis dict since AnalyzedMessageOut schema matches it partially
        # Wait, analyze_message returns a dict of the analysis result, NOT the DB object in my implementation.
        # But _store_analysis returns the DB object! 
        # Ideally, the service should return the DB object.
        # Let's assume for now it returns a dict.
        # Wait, my implementation of `analyze_message` calls `_store_analysis` but returns `analysis` (the dict).
        # Let's fix `schemas.AnalyzedMessageOut` to be compatible or fetch the DB object.
        
        # Actually, let's just fetch the latest analyzed message for this user to ensure we return the ID
        recent_msg = db.query(models.AnalyzedMessage).filter(
            models.AnalyzedMessage.user_id == current_user.id
        ).order_by(models.AnalyzedMessage.created_at.desc()).first()
        
        return recent_msg
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages/important", response_model=List[schemas.AnalyzedMessageOut])
def get_important_messages(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get important messages for today"""
    messages = db.query(models.AnalyzedMessage).filter(
        models.AnalyzedMessage.user_id == current_user.id,
        models.AnalyzedMessage.is_important == True
    ).order_by(models.AnalyzedMessage.created_at.desc()).limit(20).all()
    
    return messages

@router.post("/chat", response_model=schemas.AIChatResponse)
def chat_with_ai(
    request: schemas.AIChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Chat with AI assistant using RAG (Recent Messages + PDFs)"""
    user_message = request.message
    
    # 1. Fetch Context: Recent Messages from User's Groups
    user_group_ids = [g.group_id for g in current_user.groups]
    
    # Fetch last 30 messages
    recent_msgs = db.query(models.Message).filter(
        models.Message.group_id.in_(user_group_ids),
        models.Message.deleted_at.is_(None)
    ).order_by(models.Message.created_at.desc()).limit(30).all()
    
    # 2. Build Context String
    context_parts = []
    
    # Add PDF/Image content first (High Priority Context)
    for msg in recent_msgs:
        if msg.extracted_text:
            source = f"[Document/Image] (Sent by User {msg.sender_id} in Grp {msg.group_id})"
            context_parts.append(f"{source}:\n{msg.extracted_text[:2000]}...") # Limit text length per doc
            
    # Add recent text messages
    # Reverse to chronological order for the chat history
    for msg in reversed(recent_msgs[:15]): 
        if not msg.extracted_text: # Skip if already added as doc
            # Convert to readable string, handling timezone if present
            ts = msg.created_at.strftime("%Y-%m-%d %H:%M") if msg.created_at else "Unknown Time"
            context_parts.append(f"[Message] (Sent: {ts}) {msg.content}")
            
    context_str = "\n\n".join(context_parts)
    
    # 3. Construct Prompt
    prompt = f"""
    You are an intelligent study assistant for a student named {current_user.username}.
    
    **Context Data (Recent WhatsApp Messages & Documents):**
    {context_str}
    
    **User Query:** {user_message}
    
    **Instructions:**
    - You are a helpful AI study assistant.
    - **LANGUAGE RULE:** ALWAYS reply in **ENGLISH** by default.
    - **CRITICAL: Tool Usage for Scheduling**
      - You MUST use the `schedule_event` tool whenever the user asks to:
        * Set an alarm
        * Create a reminder
        * Schedule an event
        * "Remind me..."
        * "Wake me up..."
        * "Alert me..."
      - DO NOT say "I can't set alarms". You CAN set alarms using the schedule_event tool.
      - ALWAYS call the tool immediately when the user requests scheduling.
    - **Temporal Logic (CRITICAL):** 
      - Messages have a `(Sent: <Timestamp>)` tag. CALCULATE event dates relative to that timestamp.
      - Compare the event date to the **Current Date** provided below.
      - **If Event Date < Current Date:** Treat it as a PAST event. Ask the user: "Did you complete the [Event]?" or "How did [Event] go?". DO NOT say "You have [Event] coming up".
      - **If Event Date > Current Date:** Treat it as UPCOMING. Remind the user: "You have [Event] scheduled for [Date]."
    - Current Date/Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    - Be friendly, encouraging, and concise. "Real world" style conversation.
    """
    
    # Tool Definition
    tools_config = [
        {
            "function_declarations": [
                {
                    "name": "schedule_event",
                    "description": "Schedule a new event or reminder in the calendar",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "Title of the event"
                            },
                            "description": {
                                "type": "string",
                                "description": "Description of the event"
                            },
                            "deadline": {
                                "type": "string",
                                "description": "Date and time of the event in ISO format (YYYY-MM-DD HH:MM:SS)"
                            }
                        },
                        "required": ["title", "deadline"]
                    }
                }
            ]
        }
    ]
    
    # 4. Generate Response
    ai_text = "I'm having trouble connecting to my brain right now."
    try:
        if ai_analyzer and ai_analyzer.gemini_model:
            # Generate with tools
            response = ai_analyzer.gemini_model.generate_content(
                prompt,
                tools=tools_config
            )
            
            # Check for function call
            if response.parts and response.parts[0].function_call:
                fc = response.parts[0].function_call
                if fc.name == 'schedule_event':
                    # ... [Function call handling remains same] ...
                    args = fc.args
                    try:
                        # Parse deadline using dateutil for robustness
                        from dateutil import parser
                        deadline_str = args.get('deadline')
                        dt = parser.parse(deadline_str)
                            
                        # Make timezone aware (assume local time if naive)
                        if dt.tzinfo is None:
                            dt = dt.astimezone()
                            
                        # Create the event using the generic Event model
                        new_event = models.Event(
                            user_id=current_user.id,
                            title=args.get('title'),
                            description=args.get('description', ''),
                            event_date=dt.date(),
                            event_time=dt.time(),
                            source='ai_chat',
                            is_all_day=False,
                            reminder_minutes=30
                        )
                        db.add(new_event)
                        db.commit()
                        db.refresh(new_event)
                        
                        # Smart Notification Logic
                        # Detect if this is an "Alarm" or "Wake up call"
                        lower_title = (args.get('title') or '').lower()
                        lower_desc = (args.get('description') or '').lower()
                        is_alarm = any(k in lower_title or k in lower_desc for k in ['alarm', 'wake up', 'wake-up', 'call me'])
                        
                        if is_alarm:
                            # Alarms happen AT the time
                            reminder_time = dt
                            notif_type = "alarm"
                            priority = "CRITICAL"
                            ai_text = f"✅ Done! I'll send you a notification at {dt.strftime('%I:%M %p')} for '{args.get('title')}'."
                        else:
                            # Standard reminders: 30 mins before
                            # But if the event is very soon (< 1 hour), do 5 mins before
                            time_until = dt - datetime.now().astimezone() if dt.tzinfo else dt - datetime.now()
                            
                            if time_until.total_seconds() < 3600: # Less than 1 hour away
                                reminder_time = dt - timedelta(minutes=5)
                            else:
                                reminder_time = dt - timedelta(minutes=30)
                                
                            notif_type = "event_reminder"
                            priority = "HIGH"
                            ai_text = f"✅ Okay, I've scheduled '{args.get('title')}' for {dt.strftime('%B %d at %I:%M %p')}."

                        # Safety: Don't schedule in past
                        now_aware = datetime.now().astimezone() or datetime.now()
                        if dt.tzinfo is None: now_aware = datetime.now()
                        
                        if reminder_time < now_aware:
                             # If immediate, send in 5 seconds
                            reminder_time = now_aware + timedelta(seconds=5)

                        new_notification = models.Notification(
                            user_id=current_user.id,
                            title=f"{'⏰ Alarm' if is_alarm else '📅 Reminder'}: {new_event.title}",
                            message=f"{new_event.description or new_event.title}",
                            scheduled_time=reminder_time,
                            notification_type=notif_type,
                            related_event_id=new_event.id,
                            priority=priority,
                            is_read=False,
                            is_sent=False
                        )
                        db.add(new_notification)
                        db.commit()
                        db.refresh(new_notification) # Refresh to get ID
                        
                        # Return event data for UI button
                        return {
                            "response": ai_text,
                            "event_data": {
                                "id": new_notification.id,
                                "event_id": new_event.id,
                                "title": new_event.title,
                                "content": new_event.description or new_event.title,
                                "deadline": dt.isoformat(),
                                "group_name": "AI Assistant"
                            }
                        }
                        
                    except Exception as e:
                        print(f"Scheduling Error: {e}")
                        import traceback
                        traceback.print_exc()
                        ai_text = f"I tried to schedule that, but encountered an error: {str(e)} (Date: {args.get('deadline')})"
            else:
                 # Check if parts present, otherwise default
                 if response.parts:
                    ai_text = response.text
                 else:
                    ai_text = "I received your request but couldn't think of a response. Please try again."
                
        else:
            ai_text = "AI Service is currently unavailable."
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Chat Error: {e}")
        ai_text = f"Sorry, I encountered an error: {str(e)}"
    
    # 5. Store conversation
    conversation = models.AIConversation(
        user_id=current_user.id,
        user_message=user_message,
        ai_response=ai_text,
        context_used={'source_count': len(recent_msgs), 'function_call': 'schedule_event' if '✅' in ai_text else None}
    )
    db.add(conversation)
    db.commit()
    
    return {"response": ai_text}

@router.get("/tasks", response_model=List[schemas.AITaskOut])
def get_ai_tasks(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-generated tasks"""
    tasks = db.query(models.AITask).filter(
        models.AITask.user_id == current_user.id
    ).order_by(models.AITask.created_at.desc()).all()
    
    return tasks

@router.put("/tasks/{task_id}", response_model=schemas.AITaskOut)
def update_task(
    task_id: int,
    update_data: schemas.AITaskUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update task status"""
    task = db.query(models.AITask).filter(
        models.AITask.id == task_id,
        models.AITask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update fields if provided
    if update_data.status:
        task.status = update_data.status
        if update_data.status == 'done':
            from datetime import datetime
            task.completed_at = datetime.now()
            
    if update_data.priority:
        task.priority = update_data.priority
        
    if update_data.deadline:
        task.deadline = update_data.deadline
    
    db.commit()
    db.refresh(task)
    return task
