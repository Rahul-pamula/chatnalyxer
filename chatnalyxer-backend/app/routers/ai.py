from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user
from ..services.ai_analyzer import ai_analyzer
import google.generativeai as genai
import os

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
    """Chat with AI assistant"""
    user_message = request.message
    
    # Get context (recent important messages)
    recent_messages = db.query(models.AnalyzedMessage).filter(
        models.AnalyzedMessage.user_id == current_user.id,
        models.AnalyzedMessage.is_important == True
    ).order_by(models.AnalyzedMessage.created_at.desc()).limit(5).all()
    
    tasks = db.query(models.AITask).filter(
        models.AITask.user_id == current_user.id,
        models.AITask.status == 'pending'
    ).all()
    
    # Build prompt
    context_str = "\n".join([f"- {m.ai_summary}" for m in recent_messages])
    tasks_str = "\n".join([f"- {t.task_description}" for t in tasks])
    
    prompt = f"""
You are a personal assistant for {current_user.phone_number}.

**Recent Important Updates:**
{context_str}

**Pending Tasks:**
{tasks_str}

**User:** {user_message}

**Assistant:** (Respond helpfully, referencing context if relevant. Keep it concise.)
"""
    
    # Get AI response
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        ai_text = response.text
    except Exception as e:
        ai_text = "I'm having trouble connecting to my brain right now. Please try again."
    
    # Store conversation
    conversation = models.AIConversation(
        user_id=current_user.id,
        user_message=user_message,
        ai_response=ai_text
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
