# Local Tunnel Setup for Testing

This guide helps you expose your local backend to the internet using ngrok, allowing you to test on different devices (phones, tablets, etc.).

## Quick Start

### 1. Start the Tunnel

```bash
./start_tunnel.sh
```

This will:
- Start an ngrok tunnel for your backend (port 8000)
- Display the public HTTPS URL
- Show you exactly what to update in your mobile app config

### 2. Update Mobile App Config

Copy the URL shown in the terminal and update `chatnalyxer-mobile/src/config.ts`:

```typescript
// For web (localhost)
const LOCALHOST_URL = "http://localhost:8000";

// For mobile devices (ngrok tunnel)
const TUNNEL_URL = "https://xxxx-xx-xx-xx-xx.ngrok-free.app"; // Replace with your URL

export const BASE_URL = Platform.OS === 'web' 
  ? LOCALHOST_URL 
  : TUNNEL_URL;
```

### 3. Reload Your App

In the Expo terminal, press `r` to reload the app. Your mobile device will now connect through the tunnel.

## Alternative: Using localtunnel

If you prefer `localtunnel` (simpler but less stable):

```bash
# Install if needed
npm install -g localtunnel

# Start tunnel
lt --port 8000 --subdomain chatnalyxer-test
```

## ngrok Web Interface

While the tunnel is running, visit **http://localhost:4040** to:
- See all HTTP requests in real-time
- Inspect request/response details
- Replay requests for debugging

## Important Notes

> [!WARNING]
> **Free ngrok URLs change every time you restart**. You'll need to update your mobile config each time.

> [!TIP]
> **Get a static URL**: Sign up for a free ngrok account and use `ngrok http 8000 --domain=your-static-domain.ngrok-free.app`

> [!CAUTION]
> **Security**: Don't share your ngrok URL publicly. It exposes your local backend to the internet.

## Troubleshooting

### "ngrok not found"
Install ngrok:
```bash
brew install ngrok
# or download from https://ngrok.com/download
```

### "Connection refused"
Make sure your backend is running on port 8000:
```bash
cd chatnalyxer-backend
uvicorn app.main:app --host 0.0.0.0 --reload
```

### Mobile app can't connect
1. Check the ngrok URL is correct in `config.ts`
2. Reload the mobile app (press `r` in Expo)
3. Check ngrok web interface (http://localhost:4040) for errors
