# 📱 Mobile Testing Quick Reference

## 🚀 One-Command Setup

```bash
./start_mobile_tunnel.sh
```

This will:
- ✅ Start/check backend on localhost:8000
- ✅ Create ngrok tunnel for mobile access
- ✅ Auto-update mobile app config
- ✅ Configure WhatsApp integration for localhost

## 📋 Current Configuration

### Mobile App
- **Connects to**: Tunnel URL (auto-updated)
- **Config file**: `chatnalyxer-mobile/src/config.ts`

### Backend
- **Runs on**: localhost:8000
- **Accessible via**: Tunnel URL (for mobile) + localhost (for WhatsApp integration)

### WhatsApp Integration
- **Connects to**: localhost:8000 (direct)
- **Config file**: `whatsapp-integration/config.js`

### OTP Service
- **Deployed at**: https://chatnalyxer-whatsapp.onrender.com
- **Backend env**: `OTP_SERVICE_URL` in `.env`

## 🎯 Testing Workflow

1. **Start tunnel**:
   ```bash
   ./start_mobile_tunnel.sh
   ```

2. **Start mobile app** (in new terminal):
   ```bash
   cd chatnalyxer-mobile
   npx expo start
   ```

3. **Scan QR code** with Expo Go on your phone

4. **Test!** 🎉

## 🔗 Useful Links

- **ngrok Dashboard**: http://localhost:4040
- **Backend API Docs**: http://localhost:8000/docs
- **Backend Health**: http://localhost:8000/health

## 📚 Full Documentation

See [MOBILE_TESTING_SETUP.md](MOBILE_TESTING_SETUP.md) for:
- Architecture diagrams
- Manual setup instructions
- Troubleshooting guide
- Network flow details

## ⚠️ Important Notes

1. **Tunnel URL changes** every time you restart ngrok
2. **Re-run** `start_mobile_tunnel.sh` after stopping to get new URL
3. **Backend must be running** on localhost:8000
4. **OTP service** is deployed separately (always available)

## 🛑 Stopping

Press `Ctrl+C` in the tunnel terminal to stop everything.

## 💡 Tips

- Keep the tunnel terminal open while testing
- Check ngrok dashboard for request logs
- Backend logs show all API calls
- Mobile app auto-reloads on code changes
