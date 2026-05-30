# 📱 Chatnalyxer Mobile App

This is the Expo-based React Native mobile app for **Chatnalyxer**—an AI-powered task and deadline manager.

---

## 🏗️ Project Structure

The mobile app has been structured to separate template boilerplates, route files, and core application code cleanly:

```
chatnalyxer-mobile/
├── app/                  # Expo Router file-based screens and navigation layouts
│   ├── admin/            # Admin dashboard screens
│   ├── group/            # WhatsApp group details screen
│   ├── notifications/    # Push notifications list and detail views
│   └── _components/      # Page-specific components (ignored by navigation router)
├── assets/               # Local static media and font assets
├── src/                  # Consolidated application logic and source code
│   ├── components/       # Global UI components (e.g. AlarmModal, ThemedText, ThemedView)
│   ├── constants/        # Application constants (e.g. Colors configuration)
│   ├── context/          # React context providers (e.g. AuthContext)
│   ├── hooks/            # Custom React hooks (e.g. useNotificationObserver, useColorScheme)
│   ├── services/         # API, polling, and helper services
│   ├── theme/            # Styling parameters, gradients, and shadows
│   └── config.ts         # Base configurations and API endpoint paths
├── tsconfig.json         # TypeScript compiler configurations and path aliases
└── package.json          # Node dependencies and npm startup scripts
```

---

## 🔗 Path Aliases

To keep import paths clean and prevent deep relative path references (like `../../../../components`), path aliases are mapped in [tsconfig.json](file:///Users/rahul/Desktop/chatnalyxer/chatnalyxer-mobile/tsconfig.json):

* `@/*` maps directly to `./src/*`

For example:
```typescript
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
```

---

## 🚀 Getting Started

### 1. Install Dependencies
Run the installation command from the mobile directory:
```bash
npm install
```

### 2. Configure Endpoints
Ensure that [src/config.ts](file:///Users/rahul/Desktop/chatnalyxer/chatnalyxer-mobile/src/config.ts) is configured with the correct backend service endpoint:
```typescript
export const BASE_URL = 'http://localhost:8000'; // For local dev
```

### 3. Start Development Server
Start Expo with hot reload:
```bash
npm run start
```
* Scan the QR code with the **Expo Go** app on your phone, or press `a` for Android Emulator / `i` for iOS Simulator.
