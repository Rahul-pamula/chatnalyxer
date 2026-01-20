"""
AI Analyzer - Hybrid Engine
- Brain: Google Gemini (Free Tier) - Text Analysis
- Eyes: Azure AI Vision - Image Analysis
- Ears: Azure AI Speech - Audio Transcription
"""

import os
import json
import logging
from typing import Dict, Any, Optional
import google.generativeai as genai
from datetime import datetime, timedelta

# Optional Azure imports for image analysis
try:
    from azure.ai.vision.imageanalysis import ImageAnalysisClient
    from azure.ai.vision.imageanalysis.models import VisualFeatures
    from azure.core.credentials import AzureKeyCredential
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False
    logging.warning("Azure AI Vision not available - image analysis will be skipped")

# Optional Azure Speech SDK
try:
    import azure.cognitiveservices.speech as speechsdk
    AZURE_SPEECH_AVAILABLE = True
except ImportError:
    AZURE_SPEECH_AVAILABLE = False
    logging.warning("Azure Speech SDK not available - audio transcription will be skipped")

from ..config import settings

logger = logging.getLogger(__name__)

class AIAnalyzer:
    """
    Hybrid message analyzer combining Google Gemini (Text) and Azure AI (Media)
    """
    
    def __init__(self):
        """Initialize hybrid AI clients"""
        
        # 1. Google Gemini (The Brain)
        try:
            if not settings.GOOGLE_API_KEY:
                # Fallback to GEMINI_API_KEY if GOOGLE_API_KEY is missing (legacy support)
                api_key = settings.GEMINI_API_KEY
            else:
                api_key = settings.GOOGLE_API_KEY

            if not api_key:
                raise ValueError("Missing Google/Gemini API key")
                
            genai.configure(api_key=api_key)
            self.gemini_model = genai.GenerativeModel('gemini-2.5-flash')
            logger.info("✅ Google Gemini loaded (gemini-2.5-flash)")
        except Exception as e:
            self.gemini_model = None
            logger.warning(f"⚠️ Google Gemini disabled: {e}")

        # 1.5 Groq AI (The Speedster) - PRIMARY FOR EXPO
        try:
            from groq import Groq
            if settings.GROQ_API_KEY:
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
                self.groq_model = "llama-3.3-70b-versatile" # Fast & Smart
                logger.info(f"✅ Groq AI loaded ({self.groq_model}) - PRIMARY ENGINE")
            else:
                self.groq_client = None
                logger.warning("⚠️ Groq API Key missing - falling back to Gemini")
        except Exception as e:
            self.groq_client = None
            logger.warning(f"⚠️ Groq client initialization failed: {e}")
        
        # 2. Azure AI Vision (The Eyes)
        try:
            if not settings.AZURE_VISION_KEY or not settings.AZURE_VISION_ENDPOINT:
                raise ValueError("Missing Azure Vision credentials")
                
            self.vision_client = ImageAnalysisClient(
                endpoint=settings.AZURE_VISION_ENDPOINT,
                credential=AzureKeyCredential(settings.AZURE_VISION_KEY)
            )
            logger.info("✅ Azure Vision initialized (Eyes)")
        except Exception as e:
            self.vision_client = None
            logger.warning(f"⚠️ Azure Vision disabled: {e}")
        
        # 3. Azure AI Speech (The Ears)
        try:
            if not settings.AZURE_SPEECH_KEY:
                raise ValueError("Missing Azure Speech credentials")
                
            self.speech_config = speechsdk.SpeechConfig(
                subscription=settings.AZURE_SPEECH_KEY,
                region=settings.AZURE_SPEECH_REGION
            )
            logger.info("✅ Azure Speech initialized (Ears)")
        except Exception as e:
            self.speech_config = None
            logger.warning(f"⚠️ Azure Speech disabled: {e}")
        
    def analyze_text_message(self, content: str, created_at: datetime, user_type: str = "STUDENT") -> Dict:
        """
        Analyze text message using Groq (Primary) -> Gemini (Fallback) -> Keyword (Last Resort)
        """
        # PRIORITY 1: Try Groq
        if self.groq_client:
            try:
                return self._analyze_with_groq(content, created_at, user_type)
            except Exception as e:
                logger.error(f"❌ Groq analysis failed: {e}. Falling back to Gemini...")
        
        # PRIORITY 2: Try Gemini
        if self.gemini_model:
            return self._analyze_with_gemini(content, created_at, user_type)
            
        # PRIORITY 3: Fallback logic
        return self._fallback_analysis(content, created_at)

    def _analyze_with_groq(self, content: str, created_at: datetime, user_type: str) -> Dict:
        """Internal method for Groq analysis"""
        system_prompt = self._get_system_prompt(user_type, created_at)
        
        completion = self.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Message: \"{content}\"\nTimestamp: {created_at.isoformat()}"}
            ],
            model=self.groq_model,
            temperature=0.3, # Low temp for structured JSON
            response_format={"type": "json_object"} # Force JSON mode
        )
        
        response_text = completion.choices[0].message.content
        return self._parse_ai_response(response_text, "groq_llama3")

    def _analyze_with_gemini(self, content: str, created_at: datetime, user_type: str) -> Dict:
        """Internal method for Gemini analysis"""
        try:
            prompt = self._get_system_prompt(user_type, created_at) + f"\n\nAnalyze this Message: \"{content}\"\nTimestamp: {created_at.isoformat()}"
            
            response = self.gemini_model.generate_content(prompt)
            return self._parse_ai_response(response.text, "google_gemini_flash")
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            raise e

    def _get_system_prompt(self, user_type: str, created_at: datetime) -> str:
        """Centralized prompt generation"""
        priority_context = {
            "STUDENT": """
            HIGH Priority: Exams, assignments, deadlines, class cancellations, professor announcements
            MEDIUM Priority: Study groups, project meetings, academic events
            LOW Priority: Social events, parties, general chit-chat
            """,
            "CASUAL": """
            HIGH Priority: Family events, friend gatherings, important personal plans, time-sensitive social commitments
            MEDIUM Priority: General social updates, casual meetups
            LOW Priority: Work/study related (unless urgent), news/updates
            """,
            "PROFESSIONAL": """
            HIGH Priority: Work deadlines, client meetings, project updates, professional networking
            MEDIUM Priority: Team updates, general work communication
            LOW Priority: Social chit-chat, non-work related
            """
        }
        
        context = priority_context.get(user_type, priority_context["STUDENT"])
        
        return f"""
        You are "Chatnalyxer", an AI assistant for a {user_type} user.
        
        USER PROFILE: {user_type}
        {context}
        
        Analyze the user's message (in ANY language: English, Hindi, Telugu, etc.).

        Your Goal:
        1. Contextualize for {user_type}.
        2. Determine priority.
        3. Extract Deadlines.
        4. Generate a short personal summary.

        Date Rules:
        - "Repu" (Telugu)/"Kal" (Hindi) = TOMORROW.
        - "Ellundi" = Day after tomorrow.
        - Reference Timestamp: {created_at.isoformat()}
        - Return 'deadline' in "YYYY-MM-DD HH:MM". Default to 10:00 AM if time missing.

        STRICT RESPONSE FORMAT (JSON ONLY):
        {{
            "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
            "category": "class_related" | "exam_related" | "submission_deadline" | "college_admin" | "urgent_alert" | "social_event" | "work_related" | "general",
            "urgency_score": 0.0 to 1.0,
            "keywords": ["tag1", "tag2"],
            "deadline": "YYYY-MM-DD HH:MM" or null,
            "tasks": [{{"title": "Task Name", "deadline": "YYYY-MM-DD"}}],
            "summary": "Short interpretation."
        }}

        STRICT FILTERING (LOW PRIORITY):
        - QUESTIONS about schedules ("Is there exam?", "Repu exam undha?", "Kal chutti hai kya?") -> LOW.
        - "Guys have u completed?" provided NO subject -> LOW.
        - "Bro/Macha/Guys" start -> LOW/MEDIUM.
        - Casual checks -> LOW.
        
        CRITICAL DISTINCTION:
        - "Exam tomorrow" (Statement/Fact) -> HIGH/CRITICAL.
        - "Is there exam tomorrow?" (Question/Doubt) -> LOW.
        """

    def _parse_ai_response(self, text_response: str, method_name: str) -> Dict:
        """Helper to parse JSON from AI response"""
        try:
            # Clean markdown
            if "```json" in text_response:
                text_response = text_response.split("```json")[1].split("```")[0]
            elif "```" in text_response:
                text_response = text_response.split("```")[1].split("```")[0]
                
            analysis = json.loads(text_response.strip())
            
            return {
                'priority_level': analysis.get('priority', 'LOW'),
                'urgency_score': float(analysis.get('urgency_score', 0.0)),
                'deadline_extracted': self._parse_deadline(analysis.get('deadline')),
                'extracted_keywords': json.dumps(analysis.get('keywords', [])),
                'is_priority': 1 if analysis.get('priority') in ['CRITICAL', 'HIGH'] else 0,
                'message_category': analysis.get('category', 'general'),
                'academic_context': json.dumps({
                    'summary': analysis.get('summary', ''),
                    'tasks': analysis.get('tasks', [])
                }),
                'analysis_method': method_name
            }
        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}")
            raise e

    
    def analyze_image(self, image_url: str, image_data: bytes = None) -> Dict:
        """
        Analyze image using Azure AI Vision
        """
        if not self.vision_client:
            return {
                'caption': 'Azure Vision Disabled',
                'ocr_text': '',
                'tags': [],
                'status': 'disabled'
            }

        try:
            # Analyze image
            visual_features = ["CAPTION", "READ", "TAGS"]
            if image_url:
                result = self.vision_client.analyze_from_url(
                    image_url=image_url,
                    visual_features=visual_features
                )
            else:
                result = self.vision_client.analyze(
                    image_data=image_data,
                    visual_features=visual_features
                )
            
            # Extract information
            caption = result.caption.text if result.caption else ""
            ocr_text = ""
            if result.read and result.read.blocks:
                ocr_text = " ".join([
                    line.text 
                    for block in result.read.blocks 
                    for line in block.lines
                ])
            
            tags = [tag.name for tag in result.tags] if result.tags else []
            
            return {
                'caption': caption,
                'ocr_text': ocr_text,
                'tags': tags,
                'analysis_method': 'azure_ai_vision'
            }
            
        except Exception as e:
            logger.error(f"Azure AI Vision analysis failed: {e}")
            return {
                'caption': '',
                'ocr_text': '',
                'tags': [],
                'error': str(e)
            }
    
    def transcribe_audio(self, audio_file_path: str) -> str:
        """
        Transcribe audio using Azure AI Speech
        """
        if not self.speech_config:
            return ""

        try:
            # Configure audio input
            audio_config = speechsdk.audio.AudioConfig(filename=audio_file_path)
            
            # Create speech recognizer
            speech_recognizer = speechsdk.SpeechRecognizer(
                speech_config=self.speech_config,
                audio_config=audio_config
            )
            
            # Recognize speech
            result = speech_recognizer.recognize_once()
            
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                return result.text
            elif result.reason == speechsdk.ResultReason.NoMatch:
                logger.warning("No speech could be recognized")
                return ""
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation = result.cancellation_details
                logger.error(f"Speech recognition canceled: {cancellation.reason}")
                return ""
            
            return ""
            
        except Exception as e:
            logger.error(f"Azure AI Speech transcription failed: {e}")
            return ""
    
    def analyze_message_with_media(
        self, 
        content: str, 
        created_at: datetime,
        user_type: str = "STUDENT",  # NEW parameter
        image_url: str = None,
        image_data: bytes = None,
        audio_file: str = None,
        media_url: str = None, 
        user_examples: list = None
    ) -> Dict:
        """
        Comprehensive message analysis (Text + Image + Audio) with user context
        """
        # Start with text analysis (with user context)
        analysis = self.analyze_text_message(content, created_at, user_type)
        
        # Add image analysis if available
        if image_url or image_data:
            image_analysis = self.analyze_image(image_url, image_data)
            
            # If OCR found text, re-analyze with combined content
            if image_analysis.get('ocr_text'):
                combined_content = f"{content}\n\n[Image Text]: {image_analysis['ocr_text']}"
                analysis = self.analyze_text_message(combined_content, created_at, user_type)
                analysis['image_analysis'] = image_analysis
        
        # Add audio transcription if available
        if audio_file:
            transcription = self.transcribe_audio(audio_file)
            
            # If transcription found, re-analyze with combined content
            if transcription:
                combined_content = f"{content}\n\n[Audio Transcript]: {transcription}"
                analysis = self.analyze_text_message(combined_content, created_at, user_type)
                analysis['audio_transcription'] = transcription
        
        return analysis
    
    def _parse_deadline(self, deadline_str: Optional[str]) -> Optional[datetime]:
        """Parse deadline string to datetime"""
        if not deadline_str:
            return None
        
        try:
            return datetime.fromisoformat(deadline_str)
        except:
            return None
    
    def _fallback_analysis(self, content: str, created_at: datetime) -> Dict:
        """Fallback to keyword-based analysis"""
        from .ml_analyzer import analyzer as keyword_analyzer
        return keyword_analyzer.analyze_message(content, created_at)

# Global analyzer instance
ai_analyzer = AIAnalyzer()
