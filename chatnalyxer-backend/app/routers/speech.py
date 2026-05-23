from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import tempfile

try:
    import azure.cognitiveservices.speech as speechsdk
    SPEECH_SDK_AVAILABLE = True
except ImportError:
    SPEECH_SDK_AVAILABLE = False
    print("⚠️ Azure Speech SDK not available - speech endpoints will return errors")

from app.database import get_db
from app.models import User
from app.deps import get_current_user

router = APIRouter(prefix="/speech", tags=["speech"])

# Azure Speech configuration
SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Transcribe audio to text using Azure Speech Services
    """
    if not SPEECH_SDK_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Speech recognition not available - Azure Speech SDK not installed"
        )
    
    if not SPEECH_KEY or not SPEECH_REGION:
        raise HTTPException(
            status_code=500,
            detail="Azure Speech Services not configured"
        )

    try:
        # Save uploaded audio to temporary file
        # Accept multiple audio formats (wav, m4a, mp3, etc.)
        file_extension = audio.filename.split('.')[-1] if audio.filename else 'wav'
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_audio:
            content = await audio.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name
            
        print(f"🎤 Received audio file: {audio.filename}, size: {len(content)} bytes")

        # Configure Azure Speech
        speech_config = speechsdk.SpeechConfig(
            subscription=SPEECH_KEY,
            region=SPEECH_REGION
        )
        speech_config.speech_recognition_language = "en-US"

        # Create audio config from file
        audio_config = speechsdk.AudioConfig(filename=temp_audio_path)

        # Create speech recognizer
        speech_recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config,
            audio_config=audio_config
        )

        # Perform recognition
        result = speech_recognizer.recognize_once()

        # Clean up temp file
        os.unlink(temp_audio_path)

        # Check result
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            return {
                "success": True,
                "text": result.text,
                "confidence": 1.0  # Azure doesn't provide confidence in basic tier
            }
        elif result.reason == speechsdk.ResultReason.NoMatch:
            return {
                "success": False,
                "text": "",
                "error": "No speech could be recognized"
            }
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            return {
                "success": False,
                "text": "",
                "error": f"Speech recognition canceled: {cancellation.reason}"
            }
        else:
            return {
                "success": False,
                "text": "",
                "error": "Unknown error occurred"
            }

    except Exception as e:
        # Clean up temp file if it exists
        if 'temp_audio_path' in locals():
            try:
                os.unlink(temp_audio_path)
            except:
                pass

        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


@router.post("/synthesize")
async def synthesize_speech(
    text: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Convert text to speech using Azure Speech Services
    (Optional - currently using client-side TTS with expo-speech)
    """
    if not SPEECH_KEY or not SPEECH_REGION:
        raise HTTPException(
            status_code=500,
            detail="Azure Speech Services not configured"
        )

    try:
        # Configure Azure Speech
        speech_config = speechsdk.SpeechConfig(
            subscription=SPEECH_KEY,
            region=SPEECH_REGION
        )
        speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"

        # Create synthesizer
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)

        # Synthesize speech
        result = synthesizer.speak_text_async(text).get()

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return {
                "success": True,
                "audio_data": result.audio_data,
                "message": "Speech synthesized successfully"
            }
        else:
            return {
                "success": False,
                "error": f"Speech synthesis failed: {result.reason}"
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Speech synthesis failed: {str(e)}"
        )


@router.post("/create-event")
async def create_event_from_voice(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create an event from voice command
    
    Flow:
    1. Transcribe audio to text
    2. Extract deadline information using AI
    3. Create event
    4. Schedule reminders
    5. Send confirmation notification
    
    Example voice commands:
    - "Add exam tomorrow at 10 AM"
    - "Create meeting on Monday at 2 PM"
    - "Remind me about assignment due next Friday"
    """
    if not SPEECH_SDK_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Speech recognition not available - Azure Speech SDK not installed"
        )
    
    if not SPEECH_KEY or not SPEECH_REGION:
        raise HTTPException(
            status_code=500,
            detail="Azure Speech Services not configured"
        )

    try:
        # Step 1: Transcribe audio
        # Accept multiple audio formats
        file_extension = audio.filename.split('.')[-1] if audio.filename else 'wav'
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_extension}") as temp_audio:
            content = await audio.read()
            temp_audio.write(content)
            temp_audio_path = temp_audio.name
            
        print(f"🎤 Received audio: {audio.filename}, size: {len(content)} bytes, format: {file_extension}")

        # Configure Azure Speech with compressed audio support
        speech_config = speechsdk.SpeechConfig(
            subscription=SPEECH_KEY,
            region=SPEECH_REGION
        )
        
        # Use compressed audio format (more forgiving than raw PCM)
        compressed_format = speechsdk.audio.AudioStreamFormat(compressed_stream_format=speechsdk.AudioStreamContainerFormat.ANY)
        
        # Create audio stream from file
        class BinaryFileReaderCallback(speechsdk.audio.PullAudioInputStreamCallback):
            def __init__(self, filename: str):
                super().__init__()
                self._file = open(filename, "rb")

            def read(self, buffer: memoryview) -> int:
                try:
                    size = buffer.nbytes
                    frames = self._file.read(size)
                    buffer[:len(frames)] = frames
                    return len(frames)
                except Exception as e:
                    print(f"Error reading audio: {e}")
                    return 0

            def close(self):
                try:
                    self._file.close()
                except Exception as e:
                    print(f"Error closing file: {e}")

        # Create pull stream
        callback = BinaryFileReaderCallback(temp_audio_path)
        stream = speechsdk.audio.PullAudioInputStream(callback, compressed_format)
        audio_config = speechsdk.AudioConfig(stream=stream)

        # Create speech recognizer with auto language detection
        auto_detect_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig(
            languages=["te-IN", "hi-IN", "en-IN", "ta-IN", "kn-IN", "ml-IN"]
        )
        
        speech_recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config,
            auto_detect_source_language_config=auto_detect_config,
            audio_config=audio_config
        )

        # Perform recognition
        print(f"🎤 Starting speech recognition...")
        result = speech_recognizer.recognize_once()

        # Clean up
        callback.close()
        os.unlink(temp_audio_path)

        # Check transcription result with detailed error info
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            transcribed_text = result.text
            
            # Detect which language was spoken
            detected_language = "Unknown"
            if hasattr(result, 'properties'):
                detected_language = result.properties.get(
                    speechsdk.PropertyId.SpeechServiceConnection_AutoDetectSourceLanguageResult,
                    "Unknown"
                )
            
            print(f"🎤 Transcribed ({detected_language}): {transcribed_text}")
            
        elif result.reason == speechsdk.ResultReason.NoMatch:
            print(f"❌ No speech recognized. Details: {result.no_match_details}")
            return {
                "success": False,
                "error": "Could not understand speech. Please speak clearly and try again."
            }
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            print(f"❌ Recognition canceled: {cancellation.reason}")
            print(f"❌ Error details: {cancellation.error_details}")
            return {
                "success": False,
                "error": f"Speech recognition failed: {cancellation.error_details or 'Unknown error'}"
            }
        else:
            print(f"❌ Unexpected result reason: {result.reason}")
            return {
                "success": False,
                "error": "Could not understand speech. Please try again."
            }

        # Step 2: Extract deadline using AI
        from app.services.deadline_extractor import DeadlineExtractor
        from app.services.message_personalizer import MessagePersonalizer
        from app.services.reminder_scheduler import ReminderScheduler
        from app.services.push_service import send_push_notification
        from app.models import Event
        from datetime import datetime

        deadline_info = DeadlineExtractor.extract_deadline(
            message_text=transcribed_text,
            current_date=datetime.now()
        )

        if not deadline_info.get('has_deadline'):
            return {
                "success": False,
                "transcribed_text": transcribed_text,
                "error": "Could not detect a deadline in your voice command. Try saying something like 'Add exam tomorrow at 10 AM'"
            }

        # Step 3: Create event
        event_datetime = DeadlineExtractor.combine_datetime(
            date_str=deadline_info['deadline_date'],
            time_str=deadline_info.get('deadline_time'),
            event_type=deadline_info.get('event_type', 'event')
        )

        event = Event(
            user_id=current_user.id,
            title=deadline_info.get('subject', 'Voice Event'),
            description=f"Created by voice: {transcribed_text}",
            event_date=event_datetime.date(),
            event_time=event_datetime.time(),
            event_type=deadline_info.get('event_type'),
            source='voice_command'
        )

        db.add(event)
        db.commit()
        db.refresh(event)

        print(f"✅ Event created: {event.title}")

        # Step 4: Schedule reminders
        reminders_scheduled = await ReminderScheduler.schedule_reminders(
            db=db,
            event=event,
            user=current_user
        )

        # Step 5: Send confirmation notification
        personalizer = MessagePersonalizer()
        confirmation = personalizer.generate_notification_message(
            user_name=current_user.username,
            event_type=deadline_info.get('event_type', 'event'),
            event_details={
                'subject': deadline_info.get('subject'),
                'date': deadline_info.get('deadline_date'),
                'time': deadline_info.get('deadline_time'),
                'priority': deadline_info.get('priority', 'HIGH'),
                'time_is_estimated': deadline_info.get('time_confidence') != 'high'
            }
        )

        # Send notification
        await send_push_notification(
            db=db,
            user_id=current_user.id,
            title="✅ Event Created by Voice!",
            body=f"Added: {event.title} on {event.event_date.strftime('%b %d')} at {event.event_time.strftime('%I:%M %p')}",
            data={
                'eventId': event.id,
                'type': 'voice_event_created'
            },
            priority='HIGH'
        )

        return {
            "success": True,
            "transcribed_text": transcribed_text,
            "event": {
                "id": event.id,
                "title": event.title,
                "date": event.event_date.isoformat(),
                "time": event.event_time.isoformat(),
                "type": event.event_type
            },
            "deadline_info": deadline_info,
            "reminders_scheduled": reminders_scheduled,
            "message": f"✅ Created: {event.title}"
        }

    except Exception as e:
        # Clean up temp file if it exists
        if 'temp_audio_path' in locals():
            try:
                os.unlink(temp_audio_path)
            except:
                pass

        raise HTTPException(
            status_code=500,
            detail=f"Voice event creation failed: {str(e)}"
        )
