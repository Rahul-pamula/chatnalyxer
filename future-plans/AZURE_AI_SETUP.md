# Azure AI Integration for Chatnalyxer
## Replacing Gemini with Microsoft Azure AI Services

This guide will help you integrate 3 Azure AI services to replace Gemini and meet Imagine Cup requirements.

---

## **Why Azure AI is Better:**

1. **Higher Quota**: Azure OpenAI has much higher rate limits
2. **Better Quality**: GPT-4 for message analysis
3. **Multimodal**: Vision for images, Speech for audio
4. **Imagine Cup Requirement**: Need 2+ Microsoft AI services
5. **Cost**: Free tier + $100 student credits

---

## **Step 1: Get Azure Account & Credits**

### **1.1 Sign up for Azure**
```
Visit: https://azure.microsoft.com/free/students/
- Use your student email
- Get $100 free credits (no credit card required)
- Credits valid for 12 months
```

### **1.2 Create Azure AI Resources**

**In Azure Portal (portal.azure.com):**

1. **Azure OpenAI Service** (for message analysis)
   - Search "Azure OpenAI"
   - Click "Create"
   - Resource group: chatnalyxer-rg
   - Region: East US
   - Name: chatnalyxer-openai
   - Pricing: Standard S0

2. **Azure AI Vision** (for image analysis)
   - Search "Computer Vision"
   - Click "Create"
   - Resource group: chatnalyxer-rg
   - Region: East US
   - Name: chatnalyxer-vision
   - Pricing: Free F0

3. **Azure AI Speech** (for audio transcription)
   - Search "Speech Services"
   - Click "Create"
   - Resource group: chatnalyxer-rg
   - Region: East US
   - Name: chatnalyxer-speech
   - Pricing: Free F0

### **1.3 Get API Keys**

For each service:
1. Go to resource
2. Click "Keys and Endpoint"
3. Copy Key 1 and Endpoint
4. Save them securely

---

## **Step 2: Update Backend Code**

### **2.1 Update requirements.txt**

Add these lines to `chatnalyxer-backend/requirements.txt`:

```txt
# Azure AI Services
openai==1.54.5
azure-ai-vision-imageanalysis==1.0.0b3
azure-cognitiveservices-speech==1.40.0
azure-core==1.32.0
```

### **2.2 Update .env**

Add to `chatnalyxer-backend/.env`:

```env
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://chatnalyxer-openai.openai.azure.com/
AZURE_OPENAI_KEY=your-openai-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Azure AI Vision
AZURE_VISION_ENDPOINT=https://chatnalyxer-vision.cognitiveservices.azure.com/
AZURE_VISION_KEY=your-vision-key-here

# Azure AI Speech
AZURE_SPEECH_KEY=your-speech-key-here
AZURE_SPEECH_REGION=eastus
```

### **2.3 Update config.py**

Add to `chatnalyxer-backend/app/config.py`:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... existing settings ...
    
    # Azure OpenAI
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_KEY: str
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4"
    AZURE_OPENAI_API_VERSION: str = "2024-08-01-preview"
    
    # Azure AI Vision
    AZURE_VISION_ENDPOINT: str
    AZURE_VISION_KEY: str
    
    # Azure AI Speech
    AZURE_SPEECH_KEY: str
    AZURE_SPEECH_REGION: str = "eastus"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## **Step 3: Install Dependencies**

```bash
cd chatnalyxer-backend
pip install -r requirements.txt
```

---

## **Step 4: Test Azure AI Services**

### **4.1 Test Azure OpenAI**

Create `test_azure_openai.py`:

```python
from openai import AzureOpenAI
from app.config import settings

client = AzureOpenAI(
    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
    api_key=settings.AZURE_OPENAI_KEY,
    api_version=settings.AZURE_OPENAI_API_VERSION
)

response = client.chat.completions.create(
    model=settings.AZURE_OPENAI_DEPLOYMENT,
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Analyze this message: 'Class cancelled today'"}
    ]
)

print(response.choices[0].message.content)
```

Run: `python test_azure_openai.py`

### **4.2 Test Azure AI Vision**

Create `test_azure_vision.py`:

```python
from azure.ai.vision.imageanalysis import ImageAnalysisClient
from azure.core.credentials import AzureKeyCredential
from app.config import settings

client = ImageAnalysisClient(
    endpoint=settings.AZURE_VISION_ENDPOINT,
    credential=AzureKeyCredential(settings.AZURE_VISION_KEY)
)

# Test with a sample image URL
result = client.analyze_from_url(
    image_url="https://example.com/sample.jpg",
    visual_features=["CAPTION", "READ"]
)

print(f"Caption: {result.caption.text}")
print(f"Text: {result.read.blocks}")
```

### **4.3 Test Azure AI Speech**

Create `test_azure_speech.py`:

```python
import azure.cognitiveservices.speech as speechsdk
from app.config import settings

speech_config = speechsdk.SpeechConfig(
    subscription=settings.AZURE_SPEECH_KEY,
    region=settings.AZURE_SPEECH_REGION
)

# Test with a sample audio file
audio_config = speechsdk.audio.AudioConfig(filename="sample.wav")
speech_recognizer = speechsdk.SpeechRecognizer(
    speech_config=speech_config,
    audio_config=audio_config
)

result = speech_recognizer.recognize_once()
print(f"Transcription: {result.text}")
```

---

## **Step 5: Update ML Analyzer**

The new `azure_ai_analyzer.py` file will be created in the next step with full integration.

---

## **Benefits of Azure AI:**

| Feature | Gemini (Old) | Azure AI (New) |
|---------|--------------|----------------|
| **Rate Limit** | 15 RPM (exhausted) | 60 RPM (much higher) |
| **Quality** | Good | Excellent (GPT-4) |
| **Image Analysis** | Limited | Full OCR + captions |
| **Audio** | Not supported | Full transcription |
| **Cost** | Free (limited) | $100 credits |
| **Imagine Cup** | ❌ Not eligible | ✅ Required! |

---

## **Next Steps:**

1. ✅ Get Azure account
2. ✅ Create 3 AI resources
3. ✅ Get API keys
4. ✅ Update .env file
5. ✅ Install dependencies
6. ✅ Test each service
7. → Integrate into ml_analyzer.py (next file)

---

**Ready to proceed?** Let me know when you have the API keys!
