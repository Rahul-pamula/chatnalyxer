# Team Setup Guide

## Getting Started

This guide will help you set up the Chatnalyxer project on your local machine.

## Prerequisites

- **Python 3.9+** (for backend)
- **Node.js 18+** (for mobile app and WhatsApp services)
- **Git**
- **Expo CLI** (install with `npm install -g expo-cli`)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Rahul-pamula/chatnalyxer.git
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
# Edit .env with your configuration (see Environment Variables section below)

# Run the backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Mobile App Setup

```bash
cd chatnalyxer-mobile

# Install dependencies
npm install

# Update configuration
# Edit src/config.ts to point to your backend URL

# Start the app
npx expo start
```

### 4. Admin Dashboard Setup

```bash
cd admin-whatsapp-otp

# Install dependencies
npm install

# Start the dashboard
node admin-dashboard.js
# Access at http://localhost:3002
```

### 5. User WhatsApp Sessions Setup

```bash
cd user-whatsapp-sessions

# Install dependencies
npm install

# Start the service
node user-session.js
# Runs on port 3003
```

## Environment Variables

### Backend (.env)

Copy `.env.example` to `.env` and configure:

#### Required Variables:

- **DATABASE_URL**: Database connection string
  - Local: `sqlite:///./chatnalyxer.db`
  - Production: PostgreSQL connection string

- **GOOGLE_API_KEY**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

- **AZURE_VISION_ENDPOINT** & **AZURE_VISION_KEY**: Get from [Azure Portal](https://portal.azure.com) → Create Computer Vision resource

- **AZURE_SPEECH_KEY** & **AZURE_SPEECH_REGION**: Get from Azure Portal → Create Speech Service resource

- **AZURE_DOC_INTELLIGENCE_ENDPOINT** & **AZURE_DOC_INTELLIGENCE_KEY**: Get from Azure Portal → Create Document Intelligence resource

#### Optional Variables:

- **SECRET_KEY**: Generate a secure random string for JWT tokens
- **OTP_SERVICE_URL**: WhatsApp OTP service URL (default: deployed Render service)

### Mobile App (src/config.ts)

Update the `BASE_URL` to point to your backend:

```typescript
export const BASE_URL = 'http://localhost:8000';  // For local development
// or
export const BASE_URL = 'https://your-backend-url.com';  // For production
```

## Running All Services

Use the provided script to start all services at once:

```bash
chmod +x START_ALL_SERVICES.sh
./START_ALL_SERVICES.sh
```

Or use the individual start script:

```bash
chmod +x start_all.sh
./start_all.sh
```

## Project Structure

```
chatnalyxer/
├── chatnalyxer-backend/       # FastAPI backend
├── chatnalyxer-mobile/        # React Native Expo mobile app
├── admin-whatsapp-otp/        # Admin dashboard for WhatsApp OTP
├── user-whatsapp-sessions/    # User WhatsApp session management
└── START_ALL_SERVICES.sh      # Script to start all services
```

## Common Issues

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find and kill process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Find and kill process on port 3001-3003 (services)
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
lsof -ti:3003 | xargs kill -9
```

### Database Issues

If you encounter database errors:

```bash
cd chatnalyxer-backend
rm chatnalyxer.db  # Delete old database
# Restart backend - it will create a new database
```

### Expo/Mobile App Issues

```bash
cd chatnalyxer-mobile
rm -rf node_modules
npm install
npx expo start --clear
```

## Getting API Keys

### Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key to your `.env` file

### Azure Services
1. Go to [Azure Portal](https://portal.azure.com)
2. Create resources for:
   - Computer Vision
   - Speech Service
   - Document Intelligence
3. Copy the endpoints and keys to your `.env` file

## Development Workflow

1. **Always pull latest changes**: `git pull origin main`
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Test locally** with all services running
5. **Commit and push**: 
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request** on GitHub

## Need Help?

- Check existing documentation in the repository
- Ask in the team chat
- Review the conversation history for context on recent changes

## Important Notes

⚠️ **Never commit sensitive files**:
- `.env` files
- Database files (`.db`, `.sqlite`)
- WhatsApp session files
- API keys or secrets

These are already in `.gitignore` and should never be pushed to the repository.
