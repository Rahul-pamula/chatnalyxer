# Testing WhatsApp-Web.js Migration

## Quick Test Commands

### 1. Test index.cjs Directly
```bash
cd /Users/pamula/Desktop/chatnalyxer/whatsapp-integration
node index.cjs test_user 919876543210
```

This should:
- Initialize whatsapp-web.js client
- Generate QR code (if not authenticated)
- Or request pairing code for the phone number

### 2. Test via Backend
```bash
# Terminal 1: Start backend
cd /Users/pamula/Desktop/chatnalyxer/chatnalyxer-backend
uvicorn app.main:app --reload

# Terminal 2: Test pairing from mobile app
# Or use curl:
curl -X POST http://localhost:8000/whatsapp/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Check Status
```bash
curl http://localhost:8000/whatsapp/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return pairing code if generated.

## Expected Flow

1. Backend receives POST /whatsapp/start
2. Spawns: `node index.cjs {user_id} {phone_number}`
3. index.cjs initializes whatsapp-web.js
4. After 10 seconds, requests pairing code
5. Sends pairing code to backend via POST /whatsapp/status
6. Mobile app polls /whatsapp/status and displays code
7. User enters code in WhatsApp
8. WhatsApp links successfully
9. Groups sync automatically

## Files Changed

- `package.json` - Added whatsapp-web.js dependency
- `index.js` → `index.cjs` - Migrated from Baileys to whatsapp-web.js
- `config.js` - Changed to CommonJS exports
- `chatnalyxer-backend/app/routers/whatsapp.py` - Updated to call index.cjs
- `otp-service.js` - **NO CHANGES** (still uses Baileys with ES modules)

## Advantages

✅ whatsapp-web.js is proven (OTP service works)
✅ Better maintained than Baileys
✅ QR code fallback if pairing fails
✅ Extensive documentation
✅ Multi-user support via LocalAuth with clientId

## Next Steps

1. Test locally to verify pairing works
2. If successful, deploy to Render
3. Test on production
4. Monitor for stability
