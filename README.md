# 📱 Chatnalyxer

> **AI-powered task manager that turns WhatsApp chaos into organized productivity**

🌐 **[Visit Landing Page](https://rahul-pamula.github.io/chatnalyxer/)** | 📱 [Download App](#installation) | 📖 [Documentation](#usage)

> **⚠️ IMPORTANT**: The working code is in the [`dev_password_flow`](https://github.com/Rahul-pamula/chatnalyxer/tree/dev_password_flow) branch. Please switch to that branch for the latest development version.

Chatnalyxer helps students never miss deadlines by automatically extracting tasks and events from WhatsApp group chats using AI, then sending smart notifications at the right time.

---

## 🚀 The Problem

Students receive **hundreds of WhatsApp messages daily** across multiple group chats. Important deadlines, exam schedules, and assignment submissions get buried in the noise. **70% of students admit to missing deadlines** because of this information overload.

## 💡 The Solution

Chatnalyxer connects to your WhatsApp and uses **AI to automatically detect** when someone mentions a deadline. It extracts the task, date, and time—even understanding casual language like "tomorrow" or "next Friday"—and adds it to your personal calendar with smart notifications.

---

## ✨ Features

### 🤖 AI-Powered Extraction
- **Natural Language Processing** using Google Gemini AI
- Understands casual speech: "tomorrow", "next week", "Friday at 5 PM"
- Extracts task name, date, time, and priority level
- Multi-language support

### 📸 Multi-Modal Processing
- **Image text extraction** (Azure Vision)
- **PDF text extraction** (Azure Document Intelligence)
- **Voice message transcription** (Azure Cognitive Speech)
- Analyzes any message format for deadlines

### 📅 Smart Calendar Integration
- Automatic event creation
- Deadline tracking
- Priority-based organization
- Calendar view with upcoming tasks

### 🔔 Intelligent Notifications
- **Priority-based alerts**: Critical deadlines get alarm-style notifications
- **Customizable reminders**: Set notification timing per event
- **Snooze and complete**: Quick actions from notifications
- **Persistent alarms**: Can't be dismissed until acknowledged

### 🔒 Privacy & Security
- End-to-end encryption for WhatsApp connection
- Message content never stored (only extracted events)
- User controls which groups to monitor
- Secure authentication with JWT tokens

---

## 🏗️ Architecture

![Chatnalyxer Architecture](docs/images/architecture.png)

---

## 🛠️ Tech Stack

[![Made with FastAPI](https://img.shields.io/badge/Made%20with-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Azure AI](https://img.shields.io/badge/Azure-AI_Services-0078D4?logo=microsoft-azure)](https://azure.microsoft.com/en-us/products/ai-services)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM for database operations
- **Google Gemini AI** - Natural language processing
- **Azure AI Services**:
  - Vision API - Image text extraction
  - Document Intelligence - PDF processing
  - Cognitive Speech - Voice transcription
- **APScheduler** - Background task scheduling

### Mobile
- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and build tools
- **TypeScript** - Type-safe JavaScript
- **Expo Router** - File-based navigation
- **Expo Notifications** - Push notification system

### WhatsApp Integration
- **Node.js + Express** - WhatsApp service backend
- **Baileys** - WhatsApp Web API library
- **QR Code Authentication** - Secure device linking

### Web (Landing Page)
- **HTML5 + CSS3** - Modern, responsive design
- **Glassmorphism UI** - Premium visual effects
---

## 📦 Installation

### Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- **PostgreSQL 14+**
- **Expo Go app** (for mobile testing)
- **Azure account** (for AI services)
- **Google AI API key** (for Gemini)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/chatnalyxer.git
cd chatnalyxer
```

### 2. Backend Setup
```bash
cd chatnalyxer-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials:
# - DATABASE_URL
# - GEMINI_API_KEY
# - AZURE_VISION_KEY, AZURE_SPEECH_KEY, AZURE_DOC_INTELLIGENCE_KEY

# Run database migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload
```

### 3. WhatsApp Service Setup
```bash
cd user-whatsapp-sessions

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with backend URL

# Start WhatsApp service
npm start
```

### 4. Mobile App Setup
```bash
cd chatnalyxer-mobile

# Install dependencies
npm install

# Update backend URL in src/config.ts
# Set BASE_URL to your backend IP

# Start Expo development server
npx expo start

# Scan QR code with Expo Go app on your phone
```

### 5. Database Setup
```bash
# Create PostgreSQL database
createdb chatnalyxer

# Update DATABASE_URL in backend .env file
# Format: postgresql://user:password@localhost:5432/chatnalyxer
```

---

## 🚀 Usage

### First-Time Setup

1. **Open the mobile app** on your phone via Expo Go
2. **Create an account** with email and password
3. **Scan WhatsApp QR code** to link your WhatsApp account
4. **Select groups** you want to monitor
5. **Start receiving** automatic deadline detections!

### Daily Usage

1. **WhatsApp messages** are analyzed in real-time
2. **AI extracts deadlines** automatically
3. **Events added to calendar** without manual input
4. **Notifications sent** at the right time
5. **Mark tasks complete** directly from notifications

---

## 📸 Screenshots

> 🌐 **[View Live Demo on our Landing Page](https://rahul-pamula.github.io/chatnalyxer/)**

> Coming soon: App screenshots and demo videos

---

## 🎯 Key Features Walkthrough

### 1. WhatsApp Integration
```
User → Scan QR Code → WhatsApp Linked → Groups Synced
```

### 2. AI Message Analysis
```
"Project submission tomorrow at 5 PM"
          ↓
    [Gemini AI Analysis]
          ↓
Task: Project submission
Date: Tomorrow (Jan 8, 2026)
Time: 5:00 PM
Priority: High
```

### 3. Smart Notifications
```
High Priority  → Alarm-style alert (can't dismiss)
Medium Priority → Standard notification
Low Priority    → Silent badge update
```

---

## 🔧 Configuration

### Backend Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chatnalyxer

# AI Services
GEMINI_API_KEY=your_gemini_api_key

# Azure AI
AZURE_VISION_ENDPOINT=https://your-vision.cognitiveservices.azure.com/
AZURE_VISION_KEY=your_vision_key
AZURE_SPEECH_KEY=your_speech_key
AZURE_SPEECH_REGION=southeastasia
AZURE_DOC_INTELLIGENCE_ENDPOINT=https://your-doc-intelligence.cognitiveservices.azure.com/
AZURE_DOC_INTELLIGENCE_KEY=your_doc_intelligence_key

# Security
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Mobile App Configuration

Edit `chatnalyxer-mobile/src/config.ts`:
```typescript
export const BASE_URL = 'http://YOUR_BACKEND_IP:8000';
export const OTP_URL = 'http://YOUR_BACKEND_IP:8000';
```

---

## 🧪 Testing

### Backend Tests
```bash
cd chatnalyxer-backend
pytest tests/
```

### API Testing
```bash
# Backend should be running
curl http://localhost:8000/docs  # OpenAPI documentation
```

### Mobile Testing
- Use Expo Go for development
- Test on physical device for best results
- Ensure phone and laptop on same WiFi network

---

## 🚢 Deployment

### Backend Deployment (Azure/Render/Railway)
```bash
# Example: Deploy to Render
# 1. Create Web Service on Render
# 2. Connect GitHub repository
# 3. Set build command: pip install -r requirements.txt
# 4. Set start command: uvicorn app.main:app --host 0.0.0.0 --port 8000
# 5. Add environment variables
```

### Mobile App Build
```bash
# Build APK with EAS
npm install -g eas-cli
eas build --platform android --profile production

# Or build locally
npx expo prebuild
cd android && ./gradlew assembleRelease
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards
- **Python**: Follow PEP 8 style guide
- **JavaScript/TypeScript**: Use ESLint configuration
- **Commit messages**: Use conventional commits format

---

## 🗺️ Roadmap

### ✅ Completed
- [x] WhatsApp integration with QR authentication
- [x] AI-powered deadline extraction
- [x] Calendar event management
- [x] Smart notifications system
- [x] Multi-modal processing (images, PDFs, voice)
- [x] User authentication and security

### 🚧 In Progress
- [ ] iOS platform support
- [ ] Offline mode
- [ ] AI chat assistant for manual task entry
- [ ] Timetable upload and management

### 📋 Planned
- [ ] Spaced repetition for exam preparation
- [ ] Procrastination pattern detection
- [ ] Team collaboration features
- [ ] Integration with Google Calendar/Outlook
- [ ] Web dashboard for desktop access

---

## 🎓 Use Cases

### For Students
- Never miss assignment deadlines
- Track exam schedules automatically
- Manage project submissions
- Coordinate group meetings

### For Professionals
- Track project deadlines from team chats
- Manage meeting schedules
- Follow up on action items
- Stay organized across multiple channels

---

## 📊 Performance

- **Message processing**: < 2 seconds
- **AI analysis**: ~1-3 seconds per message
- **Notification delivery**: Real-time
- **Database queries**: Optimized with indexes
- **Mobile app**: 60 FPS smooth animations

---

## 🔐 Security

- **Authentication**: JWT-based with secure token storage
- **Password**: Bcrypt hashing with salt
- **WhatsApp**: End-to-end encryption preserved
- **API**: CORS protection and rate limiting
- **Data**: Minimal storage (events only, not messages)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Chatnalyxer Development Team**
- Project Lead & Backend Developer
- Mobile App Developer
- UI/UX Designer
- AI/ML Integration

---

## 🙏 Acknowledgments

- **Microsoft** for Azure AI Services and Imagine Cup platform
- **Google** for Gemini AI API
- **Baileys** community for WhatsApp integration
- **Expo** team for amazing mobile development tools
- **FastAPI** community for excellent documentation

---

## 📞 Contact

- **Website**: [https://rahul-pamula.github.io/chatnalyxer/](https://rahul-pamula.github.io/chatnalyxer/)
- **GitHub**: [@Rahul-pamula](https://github.com/Rahul-pamula)
- **Project Repository**: [github.com/Rahul-pamula/chatnalyxer](https://github.com/Rahul-pamula/chatnalyxer)
- **Demo**: [Watch our demo video](#)

---

<div align="center">

**Made with ❤️ by the Chatnalyxer Team**

**Turning WhatsApp chaos into organized productivity, one deadline at a time.**

[⭐ Star us on GitHub](https://github.com/yourusername/chatnalyxer) | [📝 Report Bug](https://github.com/yourusername/chatnalyxer/issues) | [✨ Request Feature](https://github.com/yourusername/chatnalyxer/issues)

</div>
