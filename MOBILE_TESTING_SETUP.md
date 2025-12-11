# Mobile Testing Setup Guide

This guide explains how to test your mobile app from your phone while keeping the backend running locally.

## Architecture Overview

```
┌─────────────────┐
│  Mobile Phone   │
│   (Expo Go)     │
└────────┬────────┘
         │
         │ HTTPS (via ngrok tunnel)
         ▼
┌─────────────────┐
│  Your Computer  │
│                 │
│  ┌───────────┐  │
│  │  Backend  │  │ ← localhost:8000
│  │  (FastAPI)│  │
│  └─────┬─────┘  │
│        │        │
│        │ HTTP   │
│        ▼        │
│  ┌───────────┐  │
│  │ WhatsApp  │  │ ← localhost (connects to backend)
│  │Integration│  │
│  └───────────┘  │
└─────────────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│  Render.com     │
│  OTP Service    │ ← https://chatnalyxer-whatsapp.onrender.com
└─────────────────┘
```

## Quick Start

### 1. Start the Mobile Tunnel

Run the automated setup script:

```bash
./start_mobile_tunnel.sh
```

This script will:
- ✅ Check if backend is running (starts it if not)
- ✅ Create an ngrok tunnel for mobile access
- ✅ Auto-update mobile app config with tunnel URL
- ✅ Configure WhatsApp integration to use localhost
- ✅ Display all necessary information

### 2. Start Your Mobile App

```bash
cd chatnalyxer-mobile
npx expo start
```

Then scan the QR code with Expo Go on your phone.

### 3. Test!

Your mobile app will now connect to your local backend via the tunnel URL.

## Configuration Details

### Mobile App (`chatnalyxer-mobile/src/config.ts`)

```typescript
// Auto-updated by start_mobile_tunnel.sh
const TUNNEL_URL = "https://xxxx.ngrok-free.app";
export const BASE_URL = TUNNEL_URL;
```

### WhatsApp Integration (`whatsapp-integration/config.js`)

```javascript
// Connects to local backend
export const BASE_URL = "http://localhost:8000";
export const API_KEY = "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4";
```

### Backend Environment (`chatnalyxer-backend/.env`)

```bash
# OTP Service (deployed on Render)
OTP_SERVICE_URL=https://chatnalyxer-whatsapp.onrender.com

# Other settings...
DATABASE_URL=sqlite:///./chatnalyxer.db
SECRET_KEY=your-secret-key
```

## Manual Setup (if needed)

### 1. Start Backend

```bash
cd chatnalyxer-backend
source ../venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --reload
```

### 2. Start ngrok Tunnel

```bash
ngrok http 8000
```

Copy the HTTPS URL (e.g., `https://xxxx.ngrok-free.app`)

### 3. Update Mobile Config

Edit `chatnalyxer-mobile/src/config.ts`:

```typescript
const TUNNEL_URL = "https://xxxx.ngrok-free.app";
export const BASE_URL = TUNNEL_URL;
```

### 4. Ensure WhatsApp Integration Uses Localhost

Edit `whatsapp-integration/config.js`:

```javascript
export const BASE_URL = "http://localhost:8000";
```

### 5. Start WhatsApp Integration (if needed)

```bash
cd whatsapp-integration
node index.js <user_id> <phone_number>
```

## Troubleshooting

### Mobile App Can't Connect

1. **Check tunnel is running**: Visit http://localhost:4040 to see ngrok dashboard
2. **Verify mobile config**: Ensure `config.ts` has the correct tunnel URL
3. **Rebuild app**: Sometimes Expo needs a fresh start
   ```bash
   cd chatnalyxer-mobile
   npx expo start -c
   ```

### Backend Not Accessible

1. **Check backend is running**: Visit http://localhost:8000/docs
2. **Check firewall**: Ensure port 8000 is not blocked
3. **Restart tunnel**: Kill ngrok and run `./start_mobile_tunnel.sh` again

### WhatsApp Integration Issues

1. **Verify config**: Check `whatsapp-integration/config.js` uses `http://localhost:8000`
2. **Check backend**: Ensure backend is running on localhost:8000
3. **Check logs**: Look for connection errors in the integration console

### OTP Not Working

The OTP service is deployed separately on Render. If OTPs aren't being sent:

1. **Check service status**: Visit https://chatnalyxer-whatsapp.onrender.com/health
2. **Check backend env**: Ensure `OTP_SERVICE_URL` is set correctly
3. **Check Render logs**: Visit your Render dashboard

## Network Flow

1. **Mobile → Backend**: 
   - Mobile app uses tunnel URL (HTTPS)
   - ngrok forwards to localhost:8000

2. **Backend → WhatsApp Integration**:
   - Backend runs on localhost:8000
   - WhatsApp integration connects directly via localhost

3. **Backend → OTP Service**:
   - Backend uses `OTP_SERVICE_URL` environment variable
   - Points to deployed Render service (HTTPS)

## Benefits of This Setup

✅ **Mobile Testing**: Test from any device, any network
✅ **Local Development**: Backend runs locally for easy debugging
✅ **Fast Iteration**: No need to deploy backend for every change
✅ **Reliable OTP**: Uses deployed service that's always available
✅ **Simple WhatsApp**: Integration connects directly to local backend

## Stopping Everything

1. **Stop tunnel**: Press `Ctrl+C` in the tunnel terminal
2. **Stop backend**: Press `Ctrl+C` in the backend terminal
3. **Stop Expo**: Press `Ctrl+C` in the Expo terminal

## ngrok Free Tier Limits

- ⚠️ Tunnel URL changes every time you restart ngrok
- ⚠️ Session timeout after 2 hours (need to restart)
- ⚠️ Limited to 40 connections/minute

For longer sessions, consider:
- ngrok paid plan (static URLs)
- LocalTunnel (free alternative)
- Tailscale (VPN-based solution)

## Tips

1. **Keep tunnel running**: Don't close the tunnel terminal while testing
2. **Update config after restart**: Tunnel URL changes, so re-run `start_mobile_tunnel.sh`
3. **Use ngrok dashboard**: http://localhost:4040 shows all requests
4. **Check backend logs**: Watch for errors in the uvicorn console
5. **Test incrementally**: Verify each component works before testing end-to-end
