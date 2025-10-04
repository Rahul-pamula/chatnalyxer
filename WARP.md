# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Chatnalyxer is an AI-powered WhatsApp academic group chat analyzer consisting of four main components:

1. **Backend API** (FastAPI) - User auth, group management, message processing, ML analysis
2. **Mobile App** (React Native/Expo) - Frontend interface for users
3. **WhatsApp Integration** (Node.js) - WhatsApp Web integration using whatsapp-web.js
4. **QR Server** (Express.js) - Standalone server for WhatsApp QR code generation

## Development Commands

### Quick Start (All Services)
```bash
# Start all services at once
./start_all.sh
```

### Backend (FastAPI)
```bash
cd chatnalyxer-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Mobile App (React Native/Expo)
```bash
cd chatnalyxer-mobile
npm install
npx expo start
# For specific platforms:
npx expo start --android
npx expo start --ios
npx expo start --web
```

### WhatsApp Integration
```bash
cd whatsapp-integration
npm install
node index.js
```

### QR Server (Standalone)
```bash
node qr-server.js  # Runs on port 3000
```

### Testing
```bash
# Run ML analyzer tests
cd chatnalyxer-backend
python test_ml_analyzer.py
python test_meeting_message.py
```

### Database Operations
```bash
cd chatnalyxer-backend
# Reset database completely
python complete_reset_db.py

# Create tables only
python create_tables.py

# Migrate database schema
python migrate_db.py

# Clean up old messages
python cleanup_old_messages.py

# Fix invalid emails in existing data
python fix_invalid_emails.py

# Check message analysis status
python check_messages.py
```

## Architecture & Key Components

### Authentication Flow
- JWT-based authentication with bcrypt password hashing
- API endpoints in `chatnalyxer-backend/app/routers/auth.py`
- OAuth2 implementation in `app/oauth2.py`
- Security utilities in `app/security.py`

### WhatsApp Integration Flow
1. **QR Generation**: QR server generates WhatsApp Web QR codes at `localhost:3000/qr`
2. **Device Linking**: User scans QR code to link WhatsApp device
3. **Group Sync**: Backend syncs groups via `/groups/sync-from-whatsapp`
4. **Message Processing**: WhatsApp integration forwards messages to `/messages/from-whatsapp`
5. **Deep Linking**: App handles `chatnalyxer://link-success` callback after successful linking

### ML-Powered Message Analysis
The system includes advanced ML analysis for educational group messages:

- **Priority Detection**: Automatically classifies messages as HIGH/MEDIUM/LOW priority
- **Deadline Extraction**: Extracts assignment deadlines and due dates
- **Keyword Analysis**: Identifies academic keywords like "urgent", "assignment", "due"
- **Sentiment Analysis**: Analyzes message sentiment and urgency
- **Implementation**: `chatnalyxer-backend/app/services/ml_analyzer.py`

### Database Schema
Uses PostgreSQL with SQLAlchemy ORM:
- **Users**: Authentication and user management
- **Groups**: WhatsApp groups with selection status
- **Messages**: Enhanced with ML analysis fields:
  - `priority_level` (HIGH/MEDIUM/LOW)
  - `urgency_score` (0.0-1.0)
  - `deadline_extracted` (extracted deadlines)
  - `extracted_keywords` (JSON array)
  - `is_priority` (boolean flag)
  - `message_category` (CLASS_CANCEL/SUBMISSION/EXAM/etc.)

## Configuration

### Environment Variables
Create `.env` files in respective directories:

**Backend** (`chatnalyxer-backend/.env`):
```
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

**WhatsApp Integration** uses `config.js`:
```javascript
export const BASE_URL = "http://localhost:8000";
export const API_KEY = "your-api-key";
```

**Mobile App** uses `src/config.ts`:
```typescript
export const BASE_URL = "http://localhost:8000";
```

### API Configuration
- Backend runs on port 8000 (FastAPI)
- QR server runs on port 3000 (Express)
- Mobile app uses Expo development server
- WhatsApp integration communicates with backend via HTTP

## Key API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/token` - Login (JWT token)

### Groups
- `GET /groups/` - List user groups
- `POST /groups/sync-from-whatsapp` - Sync groups from WhatsApp
- `PUT /groups/{group_id}/select` - Select/deselect group for monitoring

### Messages
- `POST /messages/from-whatsapp` - Receive messages from WhatsApp integration
- `GET /messages/priority/public` - Get priority messages only
- `GET /messages/analytics/public` - Get ML analytics data

### Dashboard
- `GET /dashboard/stats` - Dashboard statistics
- Various analytics endpoints for message insights

## Development Notes

### ML System Customization
- Keywords can be customized in `ml_analyzer.py`
- Priority thresholds are configurable (default: HIGH ≥ 0.7, MEDIUM 0.4-0.7)
- Supports Indian academic context with relevant keywords
- See `ML_DOCUMENTATION.md` for detailed ML system documentation

### Deep Linking Setup
The mobile app handles WhatsApp device linking callbacks via:
```
chatnalyxer://link-success
```

### WhatsApp Session Management
- Sessions are managed via whatsapp-web.js
- Session data stored in `whatsapp-integration/.wwebjs_cache/`
- Group selection stored in `selected-groups.json`

### Database Development
- Auto-creates tables on startup (development mode)
- Uses PostgreSQL with connection pooling
- Migration scripts available for schema updates
- Includes utilities for data cleanup and maintenance

## Project Structure

```
chatnalyxer/
├── chatnalyxer-backend/     # FastAPI backend
│   ├── app/
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # ML analyzer and business logic
│   │   ├── models.py        # Database models
│   │   └── main.py          # FastAPI application
│   └── ML_DOCUMENTATION.md  # Detailed ML system docs
├── chatnalyxer-mobile/      # React Native/Expo app
│   ├── app/                 # Expo Router pages
│   ├── components/          # Reusable UI components
│   └── src/config.ts        # App configuration
├── whatsapp-integration/    # Node.js WhatsApp service
│   ├── index.js             # Main WhatsApp Web integration
│   └── services/            # WhatsApp service utilities
├── qr-server.js             # Standalone QR code server
└── start_all.sh             # Development startup script
```

## Important Implementation Details

- The system uses a multi-service architecture where each component can run independently
- WhatsApp integration runs in a separate process due to Puppeteer requirements
- ML analysis happens in real-time when messages are received
- The QR server provides a web interface for WhatsApp device linking
- Mobile app uses Expo for cross-platform development
- All services communicate via HTTP APIs with JWT authentication