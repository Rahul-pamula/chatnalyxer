# User WhatsApp Sessions

**Purpose:** Multi-user WhatsApp sessions for message processing using Baileys

**Technology:** Baileys (per-user sessions)

**Ports:** 3002 (Session Manager), 4000+ (User sessions)

---

## Architecture

```
Session Manager (Port 3002)
  ├─ User 1 Session (Port 4001)
  ├─ User 2 Session (Port 4002)
  └─ User 36 Session (Port 4036)
```

---

## Features

✅ Per-user WhatsApp sessions
✅ QR code / Pairing code generation
✅ Message listening and forwarding
✅ PDF/Image processing (Azure AI)
✅ Session lifecycle management
❌ NO OTP sending

---

## Installation

```bash
cd user-whatsapp-sessions
npm install
```

---

## Running

### Start Session Manager

```bash
node session-manager.js
```

**Expected output:**
```
🚀 Starting WhatsApp Session Manager on Port 3002
✅ WhatsApp Session Manager running on http://localhost:3002
📊 Active sessions: 0
🔢 Base port for user sessions: 4000
```

---

## API Endpoints

### Session Manager (Port 3002)

```
POST /sessions/start/:userId       - Start WhatsApp session for user
POST /sessions/stop/:userId        - Stop WhatsApp session for user
GET  /sessions/status/:userId      - Get session status
GET  /sessions/qr/:userId           - Get QR code for user
POST /sessions/pairing/:userId     - Generate pairing code for user
GET  /sessions/active              - List all active sessions
GET  /health                       - Health check
```

---

## Usage

### Start a User Session

```bash
curl -X POST http://localhost:3002/sessions/start/1
```

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp session started",
  "user_id": 1,
  "port": 4001,
  "pid": 12345
}
```

### Get QR Code

```bash
curl http://localhost:3002/sessions/qr/1
```

**Response:**
```json
{
  "ready": false,
  "expired": false,
  "qr": "data:image/png;base64,..."
}
```

### Stop a Session

```bash
curl -X POST http://localhost:3002/sessions/stop/1
```

---

## Session Storage

- Per-user session data
- Stored in `sessions/user_{userId}/`
- Example:
  - `sessions/user_1/`
  - `sessions/user_2/`
  - `sessions/user_36/`

---

## Port Allocation

- **Session Manager:** 3002
- **User Sessions:** 4000 + user_id
  - User 1 → 4001
  - User 2 → 4002
  - User 36 → 4036

---

## Notes

- Each user gets their own WhatsApp process
- Sessions start/stop independently
- Automatic cleanup on disconnect
- Health monitoring every 30 seconds
