# Render Deployment Guide for Chatnalyxer

## 🚀 Quick Start

### Prerequisites
1. GitHub account
2. Render account (free): https://render.com
3. Your code pushed to GitHub

---

## Step 1: Prepare Your Repository

### 1.1 Commit Deployment Files
```bash
git add render.yaml Dockerfile .gitignore
git commit -m "Add Render deployment configuration"
git push origin dev_otp_flow
```

### 1.2 Verify Files
- ✅ `render.yaml` - Render configuration
- ✅ `Dockerfile` - Container configuration  
- ✅ `.gitignore` - Excludes sensitive files

---

## Step 2: Create Render Account

1. Go to https://render.com
2. Click "Get Started"
3. Sign up with GitHub
4. Authorize Render to access your repositories

---

## Step 3: Deploy Backend

### 3.1 Create Web Service
1. Click "New +" → "Web Service"
2. Connect your repository: `Rahul-pamula/chatnalyxer`
3. Branch: `dev_otp_flow`
4. Render will detect `render.yaml` automatically

### 3.2 Configure Backend Service
- **Name**: `chatnalyxer-backend`
- **Runtime**: Python 3
- **Build Command**: `pip install -r chatnalyxer-backend/requirements.txt`
- **Start Command**: `cd chatnalyxer-backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Plan**: Free

### 3.3 Add Environment Variables
Click "**Environment Variables**:
```
DATABASE_URL=postgresql://postgres:%4040textNLytixs123@db.hxbwhzkjvosdrksnrgwg.supabase.co:5432/postgres
SECRET_KEY=<generate-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
OTP_SERVICE_URL=http://localhost:3001
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=30
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_WINDOW_MINUTES=60
```

**Get Supabase URL**:
1. Go to your Supabase project
2. Settings → Database → Connection String
3. Copy the URI (replace `[YOUR-PASSWORD]` with your actual password)

### 3.4 Deploy
1. Click "Create Web Service"
2. Wait for deployment (~5-10 minutes)
3. Your backend URL: `https://chatnalyxer-backend.onrender.com`

---

## Step 4: Deploy WhatsApp Service

### 4.1 Create Web Service (Important!)
**Note**: We use "Web Service" instead of "Background Worker" to use the Free Tier.

1. Click "New +" → "**Web Service**"
2. Connect same repository and branch (`dev_otp_flow`)

### 4.2 Configure WhatsApp Service
- **Name**: `chatnalyxer-whatsapp`
- **Runtime**: Node
- **Build Command**: `cd whatsapp-integration && npm install`
- **Start Command**: `cd whatsapp-integration && node otp-service.js`
- **Plan**: Free

### 4.3 Add Environment Variables
- `PORT`: `3001`

### 4.4 Deploy
Click "Create Web Service".

**Note about Free Tier**: Since we are not using a paid persistent disk, if the app restarts, you may need to re-scan the QR code. We recommend setting up a "Keep Alive" ping (see below) to prevent it from sleeping.

### 4.5 Link WhatsApp (Easy Method)
Since we deployed as a Web Service, you can simply:
1. Open your WhatsApp Service URL in a browser (e.g., `https://chatnalyxer-whatsapp.onrender.com`)
2. You will see the **QR Code** on the screen
3. Scan with your admin WhatsApp (Linked Devices)
4. Screen will update to say "✅ WhatsApp Connected!"

*Note: You can also check the logs if you prefer.*

---

## Step 5: Connect Backend to WhatsApp Service (Critical!)

1. **Copy WhatsApp Service URL** from Render Dashboard (e.g., `https://chatnalyxer-whatsapp.onrender.com`)
2. Go to **Backend Service** → **Environment**
3. Edit `OTP_SERVICE_URL`
4. Change value from `http://localhost:3001` to your **WhatsApp Service URL**
5. Click **Save Changes** (Backend will restart)

---

## Step 6: Update Mobile App

### 5.1 Update Config
Edit `chatnalyxer-mobile/src/config.ts`:

```typescript
// Replace with your Render backend URL
export const BASE_URL = "https://chatnalyxer-backend.onrender.com";
```

### 5.2 Test Locally
```bash
cd chatnalyxer-mobile
npm start
```

Scan QR code with Expo Go app and test.

---

## Step 6: Share with Users

### Option A: Expo Go (Quick Testing)
1. Users install Expo Go app
2. Share your Expo URL
3. Users scan QR code

### Option B: Build APK (Production)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK
eas build --platform android --profile preview

# Download and share APK with users
```

---

## 🔧 Troubleshooting

### Backend Not Starting
**Check logs**: Render Dashboard → Your Service → Logs

Common issues:
- Missing environment variables
- Database connection failed
- Port binding error

**Solution**: Verify all environment variables are set

### WhatsApp Service Not Connecting
**Check logs**: Background Worker → Logs

Common issues:
- QR code not scanned
- Session file corrupted
- Persistent disk not mounted

**Solution**: 
1. Check disk is mounted at `/opt/render/.wwebjs-sessions-otp`
2. Restart worker and scan QR again

### Free Tier Sleep
**Problem**: Service sleeps after 15 min inactivity

**Solution**: Use cron job to ping every 10 min
```bash
# Use cron-job.org or similar
GET https://chatnalyxer-backend.onrender.com/health
```

---

## 📊 Monitor Your Deployment

### Backend Health
```bash
curl https://chatnalyxer-backend.onrender.com/health
```

### Check Logs
- Render Dashboard → Services → Logs
- Real-time log streaming

### Database
- Supabase Dashboard → Database → Tables
- Monitor user registrations and OTPs

---

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Backend | Free | $0 |
| WhatsApp Worker | Free | $0 |
| Persistent Disk (1GB) | Free | $0 |
| Database (Supabase) | Free | $0 |
| **Total** | | **$0/month** |

**Free Tier Limits**:
- 750 hours/month (enough for 24/7)
- Sleeps after 15 min inactivity
- 512MB RAM per service

---

## 🎉 You're Live!

Your Chatnalyxer is now deployed and accessible to multiple users!

**URLs**:
- Backend API: `https://chatnalyxer-backend.onrender.com`
- API Docs: `https://chatnalyxer-backend.onrender.com/docs`
- Mobile App: Share Expo link or APK

**Next Steps**:
1. Test OTP flow with real users
2. Monitor logs for errors
3. Collect feedback
4. Iterate and improve!

---

## 📝 Useful Commands

```bash
# View deployment status
git status

# Push updates
git add .
git commit -m "Update: description"
git push origin dev_otp_flow

# Render will auto-deploy on push!
```

---

## 🆘 Need Help?

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- Your logs: Render Dashboard → Logs
