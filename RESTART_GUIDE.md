# 🚀 Chatnalyxer Restart Guide

## Quick Restart (Automated)

### Option 1: Complete Restart (Recommended)
```bash
cd /Users/pamula/Desktop/chatnalyxer
./restart_all.sh
```

This will:
1. Stop all running services
2. Start backend
3. Start WhatsApp integration
4. Start ngrok tunnel
5. Update mobile config with new tunnel URL
6. Start mobile app

### Option 2: Stop All Services
```bash
./stop_all.sh
```

Then start manually (see below).

---

## Manual Restart Steps

### 1. Stop All Services

```bash
# Stop backend
pkill -f "uvicorn app.main:app"

# Stop mobile app
pkill -f "expo start"

# Stop WhatsApp integration
pkill -f "node.*index.js"

# Stop ngrok
pkill -f "ngrok"
```

### 2. Start Backend

```bash
cd chatnalyxer-backend
uvicorn app.main:app --host 0.0.0.0 --reload
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
ML analyzer loaded successfully
```

### 3. Start WhatsApp Integration

**Open a new terminal:**
```bash
cd chatnalyxer/whatsapp-integration
./clean_and_start_otp.sh
```

**Expected output:**
```
🧹 Cleaning up WhatsApp Session...
✅ Cleanup complete.
🚀 Starting OTP Service...
```

### 4. Start ngrok Tunnel

**Open a new terminal:**
```bash
cd chatnalyxer
./start_tunnel.sh
```

**Expected output:**
```
✅ Backend tunnel active!
📍 Public URL: https://xxxxxxxx.ngrok-free.app
```

**Important:** Copy the new ngrok URL!

### 5. Update Mobile Config

Edit `chatnalyxer-mobile/src/config.ts`:
```typescript
const NGROK_TUNNEL_URL = "https://YOUR-NEW-URL.ngrok-free.app";
```

### 6. Start Mobile App

**Open a new terminal:**
```bash
cd chatnalyxer-mobile
npm start
```

**Expected output:**
```
› Metro waiting on exp://...
› Web is waiting on http://localhost:8081
```

---

## Testing Checklist

After restart, verify:

- [ ] Backend responds: `curl http://localhost:8000`
- [ ] ngrok tunnel works: Visit the ngrok URL in browser
- [ ] Mobile app loads: `http://localhost:8081`
- [ ] WhatsApp integration running: Check terminal for "OTP service ready"

---

## Quick Status Check

```bash
# Check what's running
ps aux | grep -E "uvicorn|node|expo|ngrok"

# Check ports
lsof -i :8000  # Backend
lsof -i :8081  # Mobile app
lsof -i :3001  # WhatsApp OTP service
lsof -i :4040  # ngrok dashboard
```

---

## Troubleshooting

### "Port already in use"
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use stop_all.sh
./stop_all.sh
```

### "ngrok tunnel not working"
```bash
# Restart ngrok
pkill -f ngrok
./start_tunnel.sh
```

### "Mobile app not loading"
```bash
# Clear cache and restart
cd chatnalyxer-mobile
rm -rf .expo
npm start
```

---

## Environment Variables (Optional)

Create/edit `chatnalyxer-backend/.env`:
```bash
# OTP Rate Limiting (Testing Mode)
OTP_RATE_LIMIT_REQUESTS=100
OTP_RATE_LIMIT_WINDOW_MINUTES=60

# Database
DATABASE_URL=sqlite:///./chatnalyxer.db
```

---

## Fresh Start (Clean Slate)

If you want to start completely fresh:

```bash
# 1. Stop everything
./stop_all.sh

# 2. Clean WhatsApp sessions
rm -rf ~/.wwebjs-sessions-*
rm -rf whatsapp-integration/.wwebjs_cache

# 3. (Optional) Reset database
cd chatnalyxer-backend
python cleanup_group_memberships.py

# 4. Restart
cd ..
./restart_all.sh
```

---

## Quick Reference

| Service | Port | URL |
|---------|------|-----|
| Backend | 8000 | http://localhost:8000 |
| Mobile App | 8081 | http://localhost:8081 |
| WhatsApp OTP | 3001 | Internal |
| ngrok Dashboard | 4040 | http://localhost:4040 |
| ngrok Backend | - | https://xxxx.ngrok-free.app |

---

**Ready to test!** 🚀

Run `./restart_all.sh` and you're good to go!
