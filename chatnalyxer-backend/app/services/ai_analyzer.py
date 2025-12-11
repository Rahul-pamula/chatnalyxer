import google.generativeai as genai
import os
import json
from datetime import datetime
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class AIAnalyzer:
    def __init__(self):
        # Use Gemini 2.5 Flash as verified in testing
        self.model = genai.GenerativeModel('gemini-2.5-flash')
    
    def analyze_message(self, user_id: int, message_data: dict, db: Session = None):
        """
        Analyze a WhatsApp message using Gemini AI
        
        Args:
            user_id: User ID
            message_data: {
                'content': str,
                'sender': str,
                'group': str,
                'type': 'text'|'image'|'pdf'|'voice'
            }
            db: Optional DB session
        """
        if db is None:
            db = SessionLocal()
            close_db = True
        else:
            close_db = False
            
        try:
            # Load user context
            context = self._get_user_context(db, user_id)
            
            # Build prompt
            prompt = self._build_analysis_prompt(message_data, context)
            
            # Get AI analysis
            try:
                response = self.model.generate_content(prompt)
                ai_text = response.text
            except Exception as e:
                print(f"Gemini API Error: {e}")
                # Fallback if API fails
                return {
                    "priority": "medium",
                    "category": "unknown",
                    "summary": "AI Analysis Unavailable",
                    "is_important": False
                }
            
            # Parse response
            analysis = self._parse_analysis(ai_text)
            
            # Store in database
            result = self._store_analysis(db, user_id, message_data, analysis)
            
            # Update user context (async in real app, sync here for now)
            self._update_context(db, user_id, message_data, analysis)
            
            return analysis
        finally:
            if close_db:
                db.close()
    
    def _build_analysis_prompt(self, message_data, context):
        return f"""
You are a smart personal assistant for a student. Analyze this incoming WhatsApp message:

**Message Details:**
- Sender: {message_data.get('sender', 'Unknown')}
- Group: {message_data.get('group', 'Private Chat')}
- Type: {message_data.get('type', 'text')}
- Content: {message_data.get('content', '')}

**User Context:**
{json.dumps(context, indent=2)}

**Your Task:**
Analyze the message and return a JSON object with these fields:
1. "priority": "high", "medium", or "low"
2. "category": "academic", "work", "personal", "finance", "social", or "other"
3. "summary": One concise sentence summarizing the message
4. "is_important": boolean (true if it requires action or is critical info)
5. "action_items": list of strings (tasks extracted from message)
6. "deadline": "YYYY-MM-DD HH:MM" or null if no deadline derived
7. "reasoning": Brief explanation of your analysis

**Important:**
- Detect deadlines like "tomorrow by 5pm" and convert to date.
- Identifying "high" priority: exams, submissions, urgent work, boss/professor messages.
- Return ONLY the JSON object. No markdown formatting.
"""
    
    def _parse_analysis(self, ai_response: str) -> dict:
        """Parse AI response into structured data"""
        try:
            # Clean up potential markdown formatting like ```json ... ```
            clean_text = ai_response.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception as e:
            print(f"JSON Parse Error: {e}, Response: {ai_response}")
            return {
                "priority": "medium",
                "category": "other",
                "summary": ai_response[:200],
                "is_important": False,
                "action_items": [],
                "deadline": None,
                "reasoning": "Failed to parse JSON"
            }
    
    def _get_user_context(self, db: Session, user_id: int) -> dict:
        """Get user's context from database"""
        context = db.query(models.UserContext).filter(
            models.UserContext.user_id == user_id
        ).first()
        
        if context:
            # If using JSON type in Postgres, sqlalchemy returns dict automatically
            return context.context_data if context.context_data else {}
        return {}
    
    def _store_analysis(self, db: Session, user_id: int, message_data: dict, analysis: dict):
        """Store analysis in database"""
        # Parse deadline safely
        deadline_dt = None
        if analysis.get('deadline'):
            try:
                # Basic ISO parsing, might need more robust parsing later
                from dateutil import parser
                deadline_dt = parser.parse(analysis['deadline'])
            except:
                pass

        analyzed_msg = models.AnalyzedMessage(
            user_id=user_id,
            group_name=message_data.get('group'),
            sender_name=message_data.get('sender'),
            message_type=message_data.get('type'),
            original_content=message_data.get('content'),
            ai_summary=analysis.get('summary'),
            priority=analysis.get('priority'),
            category=analysis.get('category'),
            is_important=analysis.get('is_important', False),
            action_items=analysis.get('action_items', []),
            deadline=deadline_dt
        )
        db.add(analyzed_msg)
        db.commit()
        db.refresh(analyzed_msg)
        
        # Create tasks if action items exist
        if analysis.get('action_items'):
            for action in analysis['action_items']:
                task = models.AITask(
                    user_id=user_id,
                    source_message_id=analyzed_msg.id,
                    task_description=action,
                    priority=analysis.get('priority'),
                    deadline=deadline_dt,
                    created_by_ai=True
                )
                db.add(task)
            db.commit()
            
        return analyzed_msg
    
    def _update_context(self, db: Session, user_id: int, message_data: dict, analysis: dict):
        """Update user context based on new message - Placeholder for now"""
        # In the future, we will use Gemini to update the context JSON
        pass

# Create global instance
ai_analyzer = AIAnalyzer()
