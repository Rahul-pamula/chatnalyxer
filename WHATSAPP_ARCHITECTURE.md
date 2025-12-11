# WhatsApp Integration Architecture & Flow

## 🎯 Overview
Chatnalyxer uses a **multi-user WhatsApp integration** where each user links their own WhatsApp account to analyze their own group chats. The system supports concurrent users with complete data isolation.

## 🔐 Authentication & OTP Flow

### Admin WhatsApp Session (OTP Only)
- **Purpose**: Send OTP for initial login/registration
- **Scope**: Single shared session for the application
- **File**: `whatsapp-integration/otp-service.js`
- **When it runs**: Started separately, listens on port 3001

### User-Specific WhatsApp Sessions (Personal Linking)
- **Purpose**: Each user links their OWN WhatsApp to analyze their groups
- **Scope**: One session per user, isolated auth data
- **File**: `whatsapp-integration/index.js`  
- **Auth Storage**: `auth_info_baileys_{user_id}/` - separate folder per user
- **When it runs**: On-demand when user clicks "Get Pairing Code"

## 📱 Complete User Journey

### Step 1: Registration & OTP Verification
```
User → App: Enter username + phone number
App → Backend: POST /auth/register-and-request-otp
Backend → OTP Service: Send OTP request
OTP Service → Admin WhatsApp: Send OTP message via admin's WhatsApp
Admin WhatsApp → User's Phone: OTP message delivered
User → App: Enter OTP code
App → Backend: POST /auth/verify-otp
Backend: ✅ User authenticated, JWT token issued
```

**Key Points:**
- OTP is sent from the **admin's WhatsApp session** (shared across all users)
- This is ONLY for authentication, not for linking user's WhatsApp

### Step 2: WhatsApp Pairing (Post-Login)
```
User clicks "Get Pairing Code" → 
Backend: POST /whatsapp/start
  ├─ Kill existing user's WhatsApp process
  ├─ Check/install npm dependencies
  ├─ Launch: node index.js {user_id} {phone_number}
  └─ Wait for pairing code

Node.js Process (index.js):
  ├─ Creates auth folder: auth_info_baileys_{user_id}
  ├─ Initializes Baileys socket with user-specific auth
  ├─ Generates pairing code
  ├─ POST to /whatsapp/status with pairing_code
  └─ Waits for user to enter code in WhatsApp

Mobile App:
  ├─ Polls /whatsapp/status every 5 seconds
  ├─ Displays pairing code when available
  └─ Shows instructions to enter code

User:
  ├─ Receives WhatsApp notification "Link a Device"
  ├─ Opens WhatsApp → Linked Devices
  ├─ Enters 8-digit pairing code
  └─ WhatsApp is now linked to Chatnalyxer!

Node.js Process:
  ├─ Receives connection.update (connection === 'open')
  ├─ POST to /whatsapp/status { ready: true }
  ├─ Syncs user's WhatsApp groups
  └─ Starts monitoring selected groups
```

## 🏗️ Multi-User Architecture

### Data Isolation
Each user has:
- **Separate auth folder**: `auth_info_baileys_{user_id}/`
- **Separate WhatsApp session**: Independent Baileys socket
- **Separate Node.js process**: `node index.js {user_id} ...`
- **User-scoped database records**: All messages/groups tied to `user_id`

### Process Management
- Backend spawns one Node.js subprocess per user (on-demand)
- Each subprocess runs independently
- Processes communicate with backend via HTTP endpoints
- Backend tracks status per user in `whatsapp_statuses` dict

### Session Lifecycle
1. **Creation**: When user clicks "Get Pairing Code"
2. **Active**: After successful pairing, continuously monitors groups
3. **Persistence**: Auth credentials saved to disk, survives restarts
4. **Cleanup**: Can be reset by deleting `auth_info_baileys_{user_id}/` folder

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot find package baileys" (FIXED)
**Root Cause**: Subprocess started before npm install completed

**Solution**: 
- Updated `whatsapp.py` to wait for npm install completion
- Added timeout and error handling
- Verify baileys package exists before starting subprocess
- Use Docker runtime on Render to ensure deps installed at build time

### Issue 2: Pairing Code Not Appearing
**Checklist**:
1. ✅ Backend logs show "📡 Requesting Pairing Code..."
2. ✅ Node subprocess started successfully
3. ✅ Phone number passed correctly to subprocess
4. ✅ Mobile app polling `/whatsapp/status` successfully
5. ✅ Backend receiving pairing code from subprocess

**Debug Steps**:
- Check backend logs for subprocess errors
- Verify `BASE_URL` in `whatsapp-integration/config.js`
- Test manually: `curl http://localhost:8000/whatsapp/status -H "Authorization: Bearer {token}"`

### Issue 3: Multi-User Data Leakage
**Prevention**:
- All database queries filter by `user_id`
- Session folders use `user_id` in path
- Status tracking uses `user_id` as dict key
- Group sync endpoint requires `user_id` parameter

## 🚀 Deployment Considerations

### Render Configuration
**Option 1: Docker Runtime (Recommended)**
```yaml
services:
  - type: web
    name: chatnalyxer-backend
    runtime: docker
    dockerfilePath: ./Dockerfile
```
- ✅ Node.js + Python both available
- ✅ Dependencies installed at build time
- ✅ Matches local development environment

**Option 2: Python Runtime (Fallback)**
- Requires Node.js to be available in environment
- npm install runs at build time or runtime
- Less reliable, use only if Docker unavailable

### Environment Variables
Both OTP service and main backend need:
- `BASE_URL`: Backend API URL (for status updates)
- `API_KEY`: Shared secret for internal communication

### Scaling Considerations
- Each user = 1 Node.js subprocess
- Memory: ~100-150MB per subprocess
- Render free tier: 512MB RAM → ~3-4 concurrent users max
- For production: Use paid tier or separate Node.js instances

## 📊 Current Status

### ✅ Working Features
- OTP-based authentication
- User registration and login
-JWT token management
- Multi-user database isolation
- Separate auth folders per user

### 🔧 Recently Fixed
- npm install race condition
- Docker deployment configuration
- Subprocess dependency verification
- Proper error handling for npm failures

### 🚧 To Verify
- [ ] Pairing code generation on Render
- [ ] Multi-user concurrent sessions
- [ ] Group sync after pairing
- [ ] Message forwarding from groups
- [ ] Data isolation between users

## 🧪 Testing Guide

### Local Testing
```bash
# Terminal 1: Start backend
cd chatnalyxer-backend
uvicorn app.main:app --reload

# Terminal 2: Register and test pairing
curl -X POST http://localhost:8000/auth/register-and-request-otp \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "phone_number": "+1234567890"}'

# Get token after OTP verification, then:
curl -X POST http://localhost:8000/whatsapp/start \
  -H "Authorization: Bearer {TOKEN}"

# Check status:
curl http://localhost:8000/whatsapp/status \
  -H "Authorization: Bearer {TOKEN}"
```

### Multi-User Testing
1. Create 2 test accounts with different phone numbers
2. Log in with both on separate mobile devices/simulators
3. Click "Get Pairing Code" on both
4. Verify each gets unique pairing codes
5. Link both WhatsApp accounts
6. Join different groups with each account
7. Verify messages are isolated (user 1 can't see user 2's messages)

### Render Testing
1. Deploy with Docker configuration
2. Monitor build logs for npm install completion
3. Test registration → OTP → login flow
4. Test pairing code generation
5. Check logs for any errors
6. Verify group sync after successful pairing
