# WhatsApp OTP Service - Setup Guide

## The Problem

WhatsApp Web.js requires a QR code scan **before** it can send messages. This creates a problem:
- Users need OTP to login
- But WhatsApp service must be running and authenticated to send OTP
- This is a chicken-and-egg problem!

## Solutions

### Option 1: Mock OTP Mode (Default - For Development)

**How it works:**
- OTP codes are printed in the backend terminal
- No WhatsApp connection needed
- Perfect for development and testing

**To use:**
1. Start services: `./start_all.sh`
2. Backend will print OTP codes in terminal
3. Copy the OTP from terminal and paste in app

**Example output:**
```
==================================================
📱 MOCK OTP MODE - Development Only
==================================================
Phone: +91XXXXXXXXXX
OTP Code: 123456
==================================================
```

### Option 2: Real WhatsApp (For Production)

**How it works:**
- Separate WhatsApp service runs independently
- Admin scans QR code once
- Service stays authenticated and can send OTPs

**To use:**
1. Start main services: `./start_all.sh`
2. In a separate terminal: `./start_whatsapp_otp.sh`
3. Scan QR code when prompted
4. Set `USE_MOCK_OTP=false` in backend `.env`
5. Restart backend

**Steps:**
```bash
# Terminal 1: Main services
./start_all.sh

# Terminal 2: WhatsApp OTP service
./start_whatsapp_otp.sh
# Scan QR code with WhatsApp

# Update backend/.env
USE_MOCK_OTP=false

# Restart backend
```

### Option 3: Use WAHA/Twilio (Recommended for Production)

**Advantages:**
- No QR code scanning needed
- More reliable
- Better for production
- Can send to any number

**Services to consider:**
- **WAHA**: Self-hosted WhatsApp API
- **Twilio**: SMS/WhatsApp API service
- **MessageBird**: Multi-channel messaging
- **Vonage**: SMS API

## Current Configuration

By default, the system uses **Mock OTP Mode**:
- `USE_MOCK_OTP=true` (default)
- OTP codes printed in backend terminal
- No WhatsApp service needed

## Switching Modes

### Enable Mock OTP
```bash
# In chatnalyxer-backend/.env
USE_MOCK_OTP=true
```

### Enable Real WhatsApp
```bash
# In chatnalyxer-backend/.env
USE_MOCK_OTP=false
WHATSAPP_SERVICE_URL=http://localhost:3001
```

Then start WhatsApp service:
```bash
./start_whatsapp_otp.sh
```

## Recommendation

**For Development:** Use Mock OTP (default)
**For Production:** Use WAHA or Twilio API

Would you like me to implement WAHA or Twilio integration instead?
