# 🔑 Gemini API Setup Guide

## Step 1: Get Your API Key

### Visit Google AI Studio
1. Go to: **https://aistudio.google.com/app/apikey**
2. Sign in with your **student Google account**
3. Click **"Create API Key"**
4. Select **"Create API key in new project"** (or use existing)
5. **Copy the API key** (starts with `AIza...`)

### Verify Student Plan Benefits
- Visit: https://aistudio.google.com/app/prompts
- Check quota: Should show **1,500 requests/minute** (vs 15 for free tier)
- Model access: **Gemini 1.5 Pro** available

---

## Step 2: Add API Key to Your Project

### Backend (.env file)
```bash
cd chatnalyxer-backend
nano .env

# Add this line:
GEMINI_API_KEY=AIza...your_actual_key_here
```

### For Deployment (Render)
When deploying to Render, add environment variable:
- Key: `GEMINI_API_KEY`
- Value: `AIza...your_actual_key_here`

---

## Step 3: Install SDK

```bash
cd chatnalyxer-backend
source ../venv/bin/activate

# Install Google Generative AI
pip install google-generativeai

# Update requirements
pip freeze > requirements.txt
```

---

## Step 4: Test Connection

Create test file: `test_gemini.py`

```python
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Test
model = genai.GenerativeModel('gemini-1.5-pro')
response = model.generate_content("Say 'Hello from Gemini!'")

print(f"✅ Response: {response.text}")
print(f"✅ API Key working!")
```

Run test:
```bash
python test_gemini.py
```

Expected output:
```
✅ Response: Hello from Gemini!
✅ API Key working!
```

---

## 🎓 Student Plan Benefits

| Feature | Free Tier | Student Plan |
|---------|-----------|--------------|
| Requests/min | 15 | 1,500 |
| Model | Gemini 1.5 Flash | Gemini 1.5 Pro |
| Context | 32K tokens | 1M tokens |
| Multi-modal | Limited | Full support |
| Cost | Free | Free |

---

## 🔒 Security Best Practices

### ✅ DO:
- Store API key in `.env` file
- Add `.env` to `.gitignore`
- Use environment variables
- Keep key secret

### ❌ DON'T:
- Commit API key to GitHub
- Share key publicly
- Hardcode in source code
- Use in client-side code

---

## 🧪 Quick Test Examples

### Text Generation
```python
response = model.generate_content("Summarize: Meeting at 3 PM tomorrow")
print(response.text)
```

### Image Analysis (Multi-modal)
```python
import PIL.Image

img = PIL.Image.open('screenshot.jpg')
response = model.generate_content(["What's in this image?", img])
print(response.text)
```

### Chat with Memory
```python
chat = model.start_chat(history=[])
response = chat.send_message("Hi, I'm a student")
print(response.text)

response = chat.send_message("What did I just tell you?")
print(response.text)  # Will remember you're a student!
```

---

## 📊 Monitor Usage

Visit: https://aistudio.google.com/app/prompts

You can see:
- Request count
- Token usage
- Rate limits
- Error logs

---

## ✅ Setup Complete!

You're ready to integrate Gemini AI into your project! 🚀

Next: Follow the Implementation Plan to build features.
