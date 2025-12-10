# 📱 Mobile App Build - Quick Reference

## 🚀 Quick Start (3 Steps)

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```
(Create free account at expo.dev if needed)

### 3. Build APK
```bash
cd chatnalyxer-mobile
eas build --platform android --profile preview
```

⏱️ **Wait 10-20 minutes** → Get download link → Install on phone!

---

## 📋 Before Building Checklist

- [ ] Deploy backend to Render (or other hosting)
- [ ] Update `src/config.ts` with production backend URL:
  ```typescript
  export const BASE_URL = "https://your-backend.onrender.com";
  ```
- [ ] Test app with Expo Go
- [ ] Ensure app icon exists

---

## 🎯 Build Commands

### For Testing (APK)
```bash
eas build --platform android --profile preview
```
✅ Creates APK file (easy to install and share)

### For Play Store (AAB)
```bash
eas build --platform android --profile production
```
✅ Creates optimized bundle for Google Play

### Check Build Status
```bash
eas build:list
```

### Or Use Interactive Script
```bash
cd chatnalyxer-mobile
../build_mobile_app.sh
```

---

## 📦 What You Get

After build completes:
1. Download link in terminal
2. APK file (~50-100 MB)
3. Can install on any Android device

---

## 📱 Installing APK on Phone

1. **Download APK** from Expo link
2. **Transfer to phone** (via USB, email, or direct download)
3. **Enable "Install from Unknown Sources"** in Settings
4. **Tap APK** to install
5. **Open app** and test!

---

## 🔧 Configuration Files

### `app.json` ✅ (Already configured)
- App name: "Chatnalyxer"
- Package: com.chatnalyxer.mobile
- Version: 1.0.0

### `eas.json` ✅ (Already created)
- Preview: Builds APK
- Production: Builds AAB

### `src/config.ts` ⚠️ (Update before building!)
```typescript
// Change this before building:
export const BASE_URL = "https://your-deployed-backend.com";
```

---

## 💡 Important Notes

### Backend URL
- ❌ Don't use tunnel URL (changes on restart)
- ❌ Don't use localhost (won't work on phone)
- ✅ Use deployed backend (Render, Railway, etc.)

### Build Time
- First build: 15-25 minutes
- Subsequent builds: 10-15 minutes

### Costs
- Expo account: **Free**
- EAS builds: **Free tier** (limited builds/month)
- Google Play: **$25 one-time** (only if publishing)

---

## 🎓 Full Documentation

See `MOBILE_APP_BUILD_GUIDE.md` for:
- Detailed step-by-step instructions
- iOS build instructions
- Troubleshooting guide
- Environment variables setup
- Version management
- Play Store submission

---

## 🔗 Useful Links

- **Expo Dashboard**: https://expo.dev
- **Build Status**: https://expo.dev/accounts/[username]/projects/chatnalyxer-mobile/builds
- **EAS Docs**: https://docs.expo.dev/build/introduction/

---

## ⚡ Complete Workflow

```bash
# 1. Deploy backend
# (Use Render, Railway, or other hosting)

# 2. Update config
# Edit chatnalyxer-mobile/src/config.ts

# 3. Install EAS CLI (one-time)
npm install -g eas-cli

# 4. Login (one-time)
eas login

# 5. Build
cd chatnalyxer-mobile
eas build --platform android --profile preview

# 6. Wait for build
# Check status: eas build:list

# 7. Download APK
# Click link in terminal or visit expo.dev

# 8. Install on phone
# Transfer APK and install
```

---

**Ready to build? Run:** `cd chatnalyxer-mobile && eas build --platform android --profile preview`
