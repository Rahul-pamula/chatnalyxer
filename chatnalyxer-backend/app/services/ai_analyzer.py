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
from .training_collector import collector

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
            self.gemini_model = genai.GenerativeModel('gemini-flash-latest')
            logger.info("✅ Google Gemini optimized (gemini-flash-latest)")
        except Exception as e:
            self.gemini_model = None
            logger.warning(f"⚠️ Google Gemini disabled: {e}")
        
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
        Analyze text message using Google Gemini with user context
        """
        if settings.AI_PROVIDER == 'custom':
            return self._custom_model_analysis(content, created_at, user_type)

        if not self.gemini_model:
            return self._fallback_analysis(content, created_at)
            
        try:
            # User-specific priority guidelines
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
            
            # Prompt for Gemini
            prompt = f"""
            You are "Chatnalyxer", an AI assistant for a {user_type} user.
            
            USER PROFILE: {user_type}
            {context}
            
            Analyze this WhatsApp message (in ANY language: English, Hindi, Hinglish, Telugu, etc.).

            Message: "{content}"
            Timestamp: {created_at.isoformat()}

            Your Goal:
            1. Understand the message context considering the user is a {user_type}.
            2. Determine priority based on what matters to a {user_type}.
            3. Extract key info (Subject, Date, Task).
            4. Generate a Personal "AI Interpretation" (summary field).

            Date Extraction Rules:
            - "Repu" (Telugu) = TOMORROW.
            - "Ellundi" (Telugu) = Day after tomorrow.
            - "Kal" (Hindi) = Tomorrow (usually).
            - Use the provided Timestamp as "Today".
            - If "Tomorrow" is mentioned, calculate the date relative to the Timestamp.
            - Return deadline in "YYYY-MM-DD HH:MM" format. If time is not specified but date is, use "10:00" (10 AM) as default.

            Return ONLY a valid JSON object:
            {{
                "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
                "category": "class_related" | "exam_related" | "submission_deadline" | "college_admin" | "urgent_alert" | "social_event" | "work_related" | "general",
                "urgency_score": 0.0 to 1.0,
                "keywords": ["keywords", "in", "english"],
                "deadline": "YYYY-MM-DD HH:MM" (or null),
                "tasks": [{{"title": "Task (in English)", "deadline": "YYYY-MM-DD"}}] (or empty),
                "summary": "Your friendly, personal interpretation considering user is {user_type}."
            }}

            Guidelines:
            - Understand mixed languages (e.g. "Kal exam hai", "Repu function undhi").
            - CRITICAL: Immediate action needed (cancelled class, urgent deadline).
            - HIGH: Important to THIS user type.
            - MEDIUM: Somewhat relevant.
            - LOW: Not important to THIS user type.
            """
            
            # Call Gemini
            response = self.gemini_model.generate_content(prompt)
            
            # Extract JSON from potential markdown blocks
            text_response = response.text
            if "```json" in text_response:
                text_response = text_response.split("```json")[1].split("```")[0]
            elif "```" in text_response:
                text_response = text_response.split("```")[1].split("```")[0]
                
            analysis = json.loads(text_response.strip())
            
            # Convert to database format
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
                'analysis_method': f'google_gemini_flash_{user_type.lower()}'
            }
            
            # 💾 DATA COLLECTION MODE
            if settings.DATA_COLLECTION_MODE:
                collector.save_example(content, user_type, result, "gemini-flash")
                
            return result
            
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            return self._fallback_analysis(content, created_at)
    
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

    
    def _custom_model_analysis(self, content: str, created_at: datetime, user_type: str) -> Dict:
        """
        Placeholder for your Custom trained model (College Version)
        """
        logger.info(f"🧠 using CUSTOM MODEL for: {content}")
        
        # PROTOTYPE: For now, we fallback to keyword, but later this calls your local LLM/BERT
        from .ml_analyzer import analyzer as keyword_analyzer
        result = keyword_analyzer.analyze_message(content, created_at)
        result['analysis_method'] = 'custom_college_model_v1'
        return result

# Global analyzer instance
ai_analyzer = AIAnalyzer()
