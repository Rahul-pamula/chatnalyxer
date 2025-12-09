# WAHA Integration for Chatnalyxer OTP

## What is WAHA?

WAHA (WhatsApp HTTP API) is a REST API wrapper for WhatsApp that allows you to send and receive messages programmatically.

**Official Repo**: https://github.com/devlikeapro/waha

## Setup WAHA

### Option 1: Docker (Recommended)

```bash
docker run -d -p 3000:3000 --name waha --restart unless-stopped \
  -e WAHA_DASHBOARD_USERNAME=admin \
  -e WAHA_DASHBOARD_PASSWORD=admin \
  devlikeapro/waha
```

### Option 2: Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3'
services:
  waha:
    image: devlikeapro/waha
    ports:
      - "3000:3000"
    environment:
      - WHATSAPP_HOOK_URL=http://host.docker.internal:8000/whatsapp/webhook
    restart: unless-stopped
```

Run:
```bash
docker-compose up -d
```

## Configure Chatnalyxer

### 1. Update Backend Environment

Edit `chatnalyxer-backend/.env`:
```bash
# WAHA Configuration
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=your-api-key-here  # Optional, for WAHA Plus
WAHA_SESSION=default
```

### 2. Start WAHA Session

#### Method 1: Using WAHA Web UI
1. Open http://localhost:3000/dashboard
2. **Login Credentials:**
   - **Username:** `admin`
   - **Password:** Check docker logs if `admin` doesn't work: `docker logs waha` (Look for `WAHA_DASHBOARD_PASSWORD`)
   - *Current Password*: `601aa72344ac4b26a6089277f924faca`
3. Create a new session named "default"
4. Scan QR code with WhatsApp
5. Wait for status to show "WORKING"

#### Method 2: Using API

**Start session:**
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "default"}'
```

**Get QR code:**
```bash
curl http://localhost:3000/api/sessions/default/auth/qr
```

**Check status:**
```bash
curl http://localhost:3000/api/sessions/default
```

## Test OTP Sending

### 1. Check WAHA Status
```bash
curl http://localhost:3000/api/sessions/default
```

Expected response:
```json
{
  "name": "default",
  "status": "WORKING"
}
```

### 2. Test Sending Message
```bash
curl -X POST http://localhost:3000/api/sendText \
  -H "Content-Type: application/json" \
  -d '{
    "session": "default",
    "chatId": "91XXXXXXXXXX@c.us",
    "text": "Test message from Chatnalyxer"
  }'
```

### 3. Test OTP Flow

Start your backend and try logging in:
```bash
cd chatnalyxer-backend
source venv/bin/activate
uvicorn app.main:app --reload
```

The backend will now send real OTPs via WAHA!

## Setting Contact Name

To make messages appear from "Chatnalyxer" contact:

### Option 1: Set Profile Name in WhatsApp
1. Use the WhatsApp number linked to WAHA
2. Set the profile name to "Chatnalyxer"
3. Users will see "Chatnalyxer" as the sender

### Option 2: Use Business API (WAHA Plus)
WAHA Plus supports WhatsApp Business API which allows custom sender names.

## Troubleshooting

### WAHA not responding
```bash
# Check if WAHA is running
docker ps | grep waha

# View WAHA logs
docker logs waha

# Restart WAHA
docker restart waha
```

### Session not WORKING
```bash
# Delete and recreate session
curl -X DELETE http://localhost:3000/api/sessions/default
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "default"}'

# Get new QR code and scan
curl http://localhost:3000/api/sessions/default/auth/qr
```

### OTP not received
1. Check WAHA status: `curl http://localhost:3000/api/sessions/default`
2. Check backend logs for errors
3. Verify phone number format (+91XXXXXXXXXX)
4. Check WAHA logs: `docker logs waha`

## Production Deployment

### Security
1. **Use API Key**: Set `WHATSAPP_API_KEY` in WAHA
2. **Use HTTPS**: Deploy WAHA behind nginx/traefik
3. **Firewall**: Restrict WAHA port access
4. **Environment Variables**: Never commit API keys

### Reliability
1. **Auto-restart**: Use `restart: unless-stopped` in docker-compose
2. **Health Checks**: Monitor WAHA session status
3. **Backup**: Backup WAHA session data
4. **Multiple Sessions**: Use multiple WAHA instances for redundancy

## WAHA API Endpoints Used

- `POST /api/sessions` - Create session
- `GET /api/sessions/{session}` - Get session status
- `GET /api/sessions/{session}/auth/qr` - Get QR code
- `POST /api/sendText` - Send text message

## Next Steps

1. ✅ Install WAHA via Docker
2. ✅ Start WAHA session and scan QR
3. ✅ Update `.env` with WAHA configuration
4. ✅ Restart backend
5. ✅ Test OTP login flow
6. ✅ Set WhatsApp profile name to "Chatnalyxer"

## Resources

- WAHA Documentation: https://waha.devlike.pro/
- WAHA GitHub: https://github.com/devlikeapro/waha
- API Reference: https://waha.devlike.pro/docs/api/
