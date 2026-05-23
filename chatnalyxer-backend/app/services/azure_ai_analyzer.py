"""
Azure AI Analyzer - Replaces Gemini with Microsoft Azure AI Services
Integrates 3 Azure AI services:
1. Azure OpenAI (GPT-4) - Message analysis
2. Azure AI Vision - Image analysis
3. Azure AI Speech - Audio transcription
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from openai import AzureOpenAI
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.core.credentials import AzureKeyCredential
import azure.cognitiveservices.speech as speechsdk
from ..config import settings

logger = logging.getLogger(__name__)


class AzureAIAnalyzer:
    """
    Azure AI-powered message analyzer using:
    - Azure OpenAI (GPT-4) for text analysis
    - Azure AI Vision for image analysis  
    - Azure AI Speech for audio transcription
    """
    
    def __init__(self):
        """Initialize Azure AI clients with error handling for missing keys"""
        
        # Azure OpenAI Client
        try:
            if not settings.AZURE_OPENAI_KEY or not settings.AZURE_OPENAI_ENDPOINT:
                raise ValueError("Missing Azure OpenAI credentials")
                
            self.openai_client = AzureOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION
            )
            logger.info("✅ Azure OpenAI initialized")
        except Exception as e:
            self.openai_client = None
            logger.warning(f"⚠️ Azure OpenAI disabled: {e}")
        
        # Azure AI Vision Client
        try:
            if not settings.AZURE_VISION_KEY or not settings.AZURE_VISION_ENDPOINT:
                raise ValueError("Missing Azure Vision credentials")
                
            self.vision_client = ImageAnalysisClient(
                endpoint=settings.AZURE_VISION_ENDPOINT,
                credential=AzureKeyCredential(settings.AZURE_VISION_KEY)
            )
            logger.info("✅ Azure Vision initialized")
        except Exception as e:
            self.vision_client = None
            logger.warning(f"⚠️ Azure Vision disabled: {e}")
        
        # Azure AI Speech Config
        try:
            if not settings.AZURE_SPEECH_KEY:
                raise ValueError("Missing Azure Speech credentials")
                
            self.speech_config = speechsdk.SpeechConfig(
                subscription=settings.AZURE_SPEECH_KEY,
                region=settings.AZURE_SPEECH_REGION
            )
            logger.info("✅ Azure Speech initialized")
        except Exception as e:
            self.speech_config = None
            logger.warning(f"⚠️ Azure Speech disabled: {e}")
        
    def analyze_text_message(self, content: str, created_at: datetime) -> Dict:
        """
        Analyze text message using Azure OpenAI (GPT-4)
        """
        if not self.openai_client:
            return self._fallback_analysis(content, created_at)
            
        try:
            # Prompt for GPT-4
            system_prompt = """You are an AI assistant analyzing WhatsApp messages for students.
Classify messages into priority levels and extract important information.

Return JSON with this structure:
{
    "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    "category": "class_related" | "exam_related" | "submission_deadline" | "college_admin" | "urgent_alert" | "general",
    "urgency_score": 0.0-1.0,
    "keywords": ["keyword1", "keyword2"],
    "deadline": "YYYY-MM-DD HH:MM" or null,
    "tasks": [{"title": "task", "deadline": "date"}],
    "summary": "brief summary"
}

Priority Guidelines:
- CRITICAL: Immediate action (class cancelled, room changed, urgent meeting)
- HIGH: Important but not immediate (assignment due tomorrow, exam next week)
- MEDIUM: General information (meeting minutes, announcements)
- LOW: Casual conversation
"""
            
            user_prompt = f"""Analyze this WhatsApp message:

Message: "{content}"
Timestamp: {created_at.isoformat()}

Return analysis as JSON."""
            
            # Call Azure OpenAI
            response = self.openai_client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            # Parse response
            analysis = json.loads(response.choices[0].message.content)
            
            # Convert to database format
            return {
                'priority_level': analysis.get('priority', 'LOW'),
                'urgency_score': analysis.get('urgency_score', 0.0),
                'deadline_extracted': self._parse_deadline(analysis.get('deadline')),
                'extracted_keywords': json.dumps(analysis.get('keywords', [])),
                'is_priority': 1 if analysis.get('priority') in ['CRITICAL', 'HIGH'] else 0,
                'message_category': analysis.get('category', 'general'),
                'academic_context': json.dumps({
                    'summary': analysis.get('summary', ''),
                    'tasks': analysis.get('tasks', [])
                }),
                'analysis_method': 'azure_openai_gpt4'
            }
            
        except Exception as e:
            logger.error(f"Azure OpenAI analysis failed: {e}")
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
            if image_url:
                result = self.vision_client.analyze_from_url(
                    image_url=image_url,
                    visual_features=["CAPTION", "READ", "TAGS"]
                )
            else:
                result = self.vision_client.analyze(
                    image_data=image_data,
                    visual_features=["CAPTION", "READ", "TAGS"]
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
        image_url: str = None,
        image_data: bytes = None,
        audio_file: str = None
    ) -> Dict:
        """
        Comprehensive message analysis with text, image, and audio
        
        Args:
            content: Message text
            created_at: Message timestamp
            image_url: URL to image (optional)
            image_data: Raw image bytes (optional)
            audio_file: Path to audio file (optional)
            
        Returns:
            Complete analysis results
        """
        # Start with text analysis
        analysis = self.analyze_text_message(content, created_at)
        
        # Add image analysis if available
        if image_url or image_data:
            image_analysis = self.analyze_image(image_url, image_data)
            
            # If OCR found text, re-analyze with combined content
            if image_analysis.get('ocr_text'):
                combined_content = f"{content}\n\nImage text: {image_analysis['ocr_text']}"
                analysis = self.analyze_text_message(combined_content, created_at)
                analysis['image_analysis'] = image_analysis
        
        # Add audio transcription if available
        if audio_file:
            transcription = self.transcribe_audio(audio_file)
            
            # If transcription found, re-analyze with combined content
            if transcription:
                combined_content = f"{content}\n\nAudio: {transcription}"
                analysis = self.analyze_text_message(combined_content, created_at)
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
        """Fallback to keyword-based analysis if Azure AI fails"""
        from .ml_analyzer import analyzer as keyword_analyzer
        return keyword_analyzer.analyze_message(content, created_at)


# Global analyzer instance
azure_analyzer = AzureAIAnalyzer()
