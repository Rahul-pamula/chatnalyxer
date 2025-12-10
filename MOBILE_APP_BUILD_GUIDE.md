# 📱 Building Standalone Mobile App (APK/IPA)

This guide will help you build a standalone mobile app that can be installed on any Android or iOS device without needing Expo Go.

## 🎯 What You'll Get

- **Android**: APK file (can install on any Android phone)
- **iOS**: IPA file (requires Apple Developer account for distribution)

## 📋 Prerequisites

### Required
- ✅ Expo account (free) - [Sign up here](https://expo.dev/signup)
- ✅ Node.js and npm (you already have this)
- ✅ EAS CLI (we'll install this)

### For iOS Builds (Optional)
- 💰 Apple Developer Account ($99/year) - Only needed for App Store or TestFlight
- 🆓 For testing on your own device, you can use development builds

## 🚀 Step-by-Step Guide

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Enter your Expo credentials (create account at expo.dev if you don't have one).

### Step 3: Configure Your Project

```bash
cd chatnalyxer-mobile
eas build:configure
```

This will:
- Create `eas.json` (already created for you!)
- Link your project to Expo
- Generate a project ID

### Step 4: Update Backend URL for Production

Before building, you need to decide on your backend URL:

**Option A: Use Deployed Backend (Recommended)**
```typescript
// src/config.ts
export const BASE_URL = "https://your-backend.onrender.com";
```

**Option B: Use Tunnel (For Testing Only)**
```typescript
// src/config.ts
export const BASE_URL = "https://your-tunnel-url.ngrok-free.app";
```

⚠️ **Important**: Tunnel URLs change every restart, so use a deployed backend for production builds!

### Step 5: Build for Android (APK)

```bash
# Preview build (APK - easy to install)
eas build --platform android --profile preview

# Production build (AAB - for Play Store)
eas build --platform android --profile production
```

**What happens:**
1. EAS uploads your code to Expo servers
2. Builds the app in the cloud (takes 10-20 minutes)
3. Gives you a download link for the APK

### Step 6: Build for iOS (Optional)

```bash
# For testing on simulator
eas build --platform ios --profile preview

# For real devices (requires Apple Developer account)
eas build --platform ios --profile production
```

### Step 7: Download and Install

After the build completes:

1. **Check build status**:
   ```bash
   eas build:list
   ```

2. **Download the APK**:
   - Visit the URL provided by EAS
   - Or check your Expo dashboard: https://expo.dev/accounts/[your-username]/projects/chatnalyxer-mobile/builds

3. **Install on Android**:
   - Transfer APK to your phone
   - Enable "Install from Unknown Sources" in Settings
   - Tap the APK to install

## 📦 Build Profiles Explained

### Development Build
```bash
eas build --platform android --profile development
```
- Includes development tools
- Larger file size
- Good for debugging

### Preview Build (Recommended for Testing)
```bash
eas build --platform android --profile preview
```
- Creates APK (easy to install)
- Smaller than development
- Perfect for sharing with testers

### Production Build
```bash
eas build --platform android --profile production
```
- Optimized and minified
- Creates AAB for Play Store
- Use `--profile preview` if you want APK instead

## 🔧 Configuration Files

### `app.json` (Updated)
```json
{
  "expo": {
    "name": "Chatnalyxer",
    "android": {
      "package": "com.chatnalyxer.mobile",
      "versionCode": 1
    },
    "ios": {
      "bundleIdentifier": "com.chatnalyxer.mobile",
      "buildNumber": "1.0.0"
    }
  }
}
```

### `eas.json` (Created)
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"  // Creates APK instead of AAB
      }
    }
  }
}
```

## 🎨 Before Building - Checklist

- [ ] Update `src/config.ts` with production backend URL
- [ ] Test the app thoroughly with Expo Go
- [ ] Ensure all features work
- [ ] Check app icon exists at `assets/images/chatnalyxer-logo.png`
- [ ] Update version in `app.json` if needed

## 📱 Quick Build Commands

### For Android APK (Easiest)
```bash
cd chatnalyxer-mobile
eas build --platform android --profile preview
```

### For Both Platforms
```bash
eas build --platform all --profile preview
```

### Check Build Status
```bash
eas build:list
```

## 🌐 Backend Deployment Options

Since you need a permanent URL for the app:

### Option 1: Deploy to Render (Free)
```bash
# Already set up in your project!
# Just push to GitHub and connect to Render
```

### Option 2: Use Railway
```bash
# Fast and reliable
# $5/month (no free tier)
```

### Option 3: Use Fly.io
```bash
# Free tier available
# More complex setup
```

## 📊 Build Process Timeline

1. **Upload code**: 1-2 minutes
2. **Build on Expo servers**: 10-20 minutes
3. **Download APK**: 1-2 minutes

**Total**: ~15-25 minutes per build

## 💡 Tips for Success

### 1. Use Environment Variables
Create `app.config.js` instead of `app.json`:

```javascript
export default {
  expo: {
    name: "Chatnalyxer",
    extra: {
      apiUrl: process.env.API_URL || "https://your-backend.onrender.com"
    }
  }
};
```

Then in your code:
```typescript
import Constants from 'expo-constants';
export const BASE_URL = Constants.expoConfig?.extra?.apiUrl;
```

### 2. Version Management
Update version before each build:
```json
{
  "version": "1.0.1",
  "android": {
    "versionCode": 2  // Increment for each build
  }
}
```

### 3. Test Before Building
Always test with Expo Go first:
```bash
npx expo start
```

### 4. Monitor Builds
Check build progress:
```bash
eas build:list
# Or visit: https://expo.dev
```

## 🐛 Troubleshooting

### Build Failed
```bash
# Check build logs
eas build:list
# Click on the failed build to see logs
```

### App Crashes on Install
- Check if backend URL is correct
- Verify all dependencies are in package.json
- Test with Expo Go first

### Can't Install APK
- Enable "Install from Unknown Sources"
- Check if APK is for correct architecture
- Try uninstalling old version first

## 🎯 Recommended Workflow

### For Development
```bash
npx expo start  # Test with Expo Go
```

### For Testing with Others
```bash
# 1. Deploy backend to Render
# 2. Update config.ts with deployed URL
# 3. Build APK
eas build --platform android --profile preview
# 4. Share APK link with testers
```

### For Production
```bash
# 1. Ensure backend is stable
# 2. Update version numbers
# 3. Build production
eas build --platform android --profile production
# 4. Submit to Play Store (optional)
```

## 📚 Next Steps After Building

1. **Test the APK** on multiple devices
2. **Deploy backend** to Render for permanent URL
3. **Share with testers** via APK link
4. **Collect feedback** and iterate
5. **Submit to Play Store** (optional, requires $25 one-time fee)

## 🔗 Useful Links

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Expo Dashboard**: https://expo.dev
- **Build Status**: https://expo.dev/accounts/[username]/projects/chatnalyxer-mobile/builds
- **Play Store Console**: https://play.google.com/console (for publishing)

## 💰 Costs

- **Expo Account**: Free
- **EAS Build**: Free tier (limited builds/month)
- **Google Play Store**: $25 one-time fee
- **Apple App Store**: $99/year

## ⚡ Quick Start (TL;DR)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Go to project
cd chatnalyxer-mobile

# Update backend URL in src/config.ts
# Then build
eas build --platform android --profile preview

# Wait 15-20 minutes
# Download APK from link provided
# Install on phone
```

---

**Ready to build your app? Start with Step 1!** 🚀
