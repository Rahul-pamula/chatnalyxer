# Admin WhatsApp OTP Service

**Purpose:** Send OTPs for user authentication using WhatsApp Web.js

**Technology:** whatsapp-web.js (single session)

**Port:** 3001

---

## Features

✅ Send OTP messages to phone numbers
✅ Admin dashboard
✅ Admin authentication
❌ NO message listening
❌ NO user sessions

---

## Installation

```bash
cd admin-whatsapp-otp
npm install
```

---

## Running

```bash
node admin-otp-service.js
```

**Expected output:**
```
🚀 Starting Admin OTP Service on Port 3001
✅ Admin OTP Service running on http://localhost:3001
📊 Dashboard: http://localhost:3001
🔐 Default credentials: admin / admin123
```

---

## API Endpoints

```
POST /send-otp              - Send OTP to phone number
GET  /admin/dashboard       - Admin dashboard
POST /admin/login           - Admin login
POST /admin/logout          - Admin logout
GET  /health                - Health check
```

---

## Usage

### Send OTP

```bash
curl -X POST http://localhost:3001/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+917330864041",
    "message": "Your OTP is: 123456"
  }'
```

---

## Session Storage

- Single admin WhatsApp session
- Stored in `.wwebjs_auth/`
- Persists across restarts

---

## Notes

- This service is ONLY for sending OTPs
- Does NOT listen to messages
- Does NOT handle user sessions
- Independent from user WhatsApp sessions
