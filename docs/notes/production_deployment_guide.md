# 🚀 Chatnalyzer Production Deployment Guide

This guide provides a step-by-step production deployment strategy for the **Chatnalyzer** SaaS platform using Docker, Render, Azure, and Supabase.

---

## 📊 Final Architecture Diagram

Below is the high-level network and request flow of the production Chatnalyzer system:

```
[ Mobile App (Expo Go / Standalone APK) ]  ──(HTTPS)──┐
                                                      │
[ Admin Dashboard (React / Vite) ]  ────────(HTTPS)───┼─► [ Render Load Balancer ]
                                                      │           │
[ WhatsApp Web Client (Baileys Node app) ] ─(HTTPS)──┘           │ (Proxy to internal port)
                                                                 ▼
                                                        [ FastAPI/Express Backend ]
                                                                 │
                                                   ┌─────────────┴─────────────┐
                                                   ▼                           ▼
                                          [ Supabase (Postgres) ]   [ Azure Session VM ]
                                                                               │
                                                                       (Persistent Disk)
                                                                       - user_1/auth/
                                                                       - user_2/auth/
```

---

## 📂 Production Folder Structure

A clean, production-grade folder structure for the entire monorepo:

```
chatnalyzer/
├── chatnalyzer-backend/          # Node.js Express or FastAPI backend
│   ├── src/                      # Source code files
│   ├── Dockerfile                # Production multi-stage Dockerfile
│   └── package.json
├── admin-whatsapp-otp/           # React/Vite Admin Dashboard
│   ├── src/
│   ├── nginx.conf                # Nginx proxy routing configuration
│   ├── Dockerfile                # Multi-stage React + Nginx Dockerfile
│   └── package.json
├── chatnalyxer-mobile/           # Expo React Native App
│   ├── src/
│   ├── app.json                  # Expo Config
│   └── package.json
├── azure-whatsapp-service/       # Separate VM Node.js session service
│   ├── src/
│   │   ├── session-manager.js    # Multi-client manager
│   │   └── user-session.js       # Individual WhatsApp client process
│   ├── Dockerfile                # PM2 persistent container config
│   └── package.json
└── docker-compose.yml            # Local development orchestration
```

---

## 🐳 Dockerfiles & Core Concepts

### 1. Backend Dockerfile (Node.js Express)
Place this in `chatnalyzer-backend/Dockerfile`:

```dockerfile
# Stage 1: Build & Install dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package management files first to leverage build cache
COPY package*.json ./

# Install packages clean and lock versions
RUN npm ci --omit=dev

# Stage 2: Production release
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Copy only node_modules and code from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

# Use non-root node user for security
USER node

CMD ["node", "src/server.js"]
```

---

### 2. Admin Panel Dockerfile (React Vite + Nginx)
Place this in `admin-whatsapp-otp/Dockerfile`:

```dockerfile
# Stage 1: Compile React app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Nginx Web Server
FROM nginx:alpine AS runner

# Remove default configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from stage 1 to the Nginx HTML directory
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Custom Nginx Config (`admin-whatsapp-otp/nginx.conf`)
Ensure this file exists to prevent SPA routing issues (404 on refresh):
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

---

### 💡 Core Docker Terminology Explained

*   **`WORKDIR`**: Sets the working directory inside the container for any subsequent instructions (`RUN`, `CMD`, `COPY`, `ADD`). It automatically creates the directory if it does not exist.
*   **`COPY`**: Copies files/directories from your host machine into the container filesystem. Using `COPY package*.json ./` first isolates package changes from code changes, utilizing Docker's layer cache.
*   **`npm install` vs `npm ci`**:
    *   `npm install` can update package versions dynamically based on semver matching (`^` or `~`), writing changes back to the lockfile.
    *   `npm ci` (Clean Install) bypasses package resolution, installs the *exact* dependency versions locked in `package-lock.json`, and deletes `node_modules` before installing. This ensures absolute stability in production builds.
*   **Multi-Stage Builds**: Builds that use multiple `FROM` instructions. This allows you to compile or install dependencies in an initial heavy environment (with SDKs and development tools), and copy only the final runtime files into a lightweight production container. This drastically reduces final image sizes (from 1GB+ to ~150MB).

---

## ☁️ Render Deployment (Docker Services)

Render will monitor your GitHub repository and build the Dockerfile automatically.

### Step-by-Step Setup:
1.  **Create Service**: Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2.  **Repository**: Connect your GitHub repository.
3.  **Service Settings**:
    *   **Runtime**: Select `Docker`.
    *   **Root Directory**: Set this to `chatnalyzer-backend` (or `admin-whatsapp-otp` depending on the service). This instructs Render to execute the Docker build within that specific subfolder.
4.  **Environment Variables**:
    *   Do **NOT** commit `.env` files to GitHub.
    *   Define them directly in the Render Web Service dashboard under the **Environment** tab:
        *   `PORT`: `8000` (Render will map this to the public URL).
        *   `DATABASE_URL`: `postgresql://...` (your Supabase string).
        *   `SESSION_MANAGER_URL`: `https://your-azure-vm-ip-or-domain:3002`.
5.  **Auto Deploy**: Enable auto-deploys so Render automatically triggers a new Docker build whenever changes are merged into the `main` branch.

---

## 🔵 Azure WhatsApp Service

To keep WhatsApp sessions online, we run a dedicated virtual machine (Azure VM / Ubuntu) with persistent disk storage.

### 1. Code Setup (`azure-whatsapp-service`)
Create the service files:

#### `package.json`
```json
{
  "name": "azure-whatsapp-service",
  "version": "1.0.0",
  "main": "src/session-manager.js",
  "dependencies": {
    "@whiskeysockets/baileys": "^6.6.0",
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5"
  }
}
```

#### `src/session-manager.js`
```javascript
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const SESSIONS_DIR = process.env.PERSISTENT_SESSION_DIR || path.join(__dirname, '../sessions');

// Active socket references
const activeSessions = {};

// API: Start user WhatsApp connection session
app.post('/sessions/start/:userId', async (req, res) => {
    const { userId } = req.params;
    const sessionPath = path.join(SESSIONS_DIR, `user_${userId}`);

    if (activeSessions[userId]) {
        return res.status(200).json({ success: true, message: 'Session already active' });
    }

    try {
        // MultiFileAuth saves session keys inside the persistent folder structure
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                // Store base64 qr code on disk or database for API retrieval
                fs.writeFileSync(path.join(sessionPath, 'qr.txt'), qr);
            }
            if (connection === 'open') {
                fs.writeFileSync(path.join(sessionPath, 'status.txt'), 'connected');
                console.log(`✅ Session opened for User ${userId}`);
            }
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
                console.log(`❌ Session closed for User ${userId}. Reconnecting: ${shouldReconnect}`);
                if (!shouldReconnect) {
                    delete activeSessions[userId];
                }
            }
        });

        activeSessions[userId] = sock;
        res.status(200).json({ success: true, message: 'WhatsApp session initialized' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Check Status
app.get('/sessions/status/:userId', (req, res) => {
    const { userId } = req.params;
    const sessionPath = path.join(SESSIONS_DIR, `user_${userId}`);
    const statusFile = path.join(sessionPath, 'status.txt');
    const isConnected = fs.existsSync(statusFile) && fs.readFileSync(statusFile, 'utf8') === 'connected';

    res.json({ userId, active: !!activeSessions[userId], ready: isConnected });
});

// API: Get QR Code
app.get('/sessions/qr/:userId', (req, res) => {
    const { userId } = req.params;
    const qrFile = path.join(SESSIONS_DIR, `user_${userId}/qr.txt`);
    
    if (fs.existsSync(qrFile)) {
        const qr = fs.readFileSync(qrFile, 'utf8');
        return res.json({ qr });
    }
    res.status(404).json({ error: 'QR Code not available yet' });
});

app.listen(PORT, () => {
    console.log(`🚀 Azure WhatsApp Service listening on port ${PORT}`);
});
```

### 2. Azure Persistence Storage Config
Because Docker container file storage is ephemeral, VMs will wipe state on restart. We must bind-mount a persistent host directory to the container.

1.  **Configure VM Volume**: On the Azure portal, attach a data disk to the Virtual Machine.
2.  **Mount Directory**: Format and mount the disk to a directory (e.g. `/mnt/whatsapp-data/`).
3.  **Run with Docker**: Bind-mount the host directory into the container's sessions folder:
    ```bash
    docker run -d \
      -p 3002:3002 \
      -v /mnt/whatsapp-data/sessions:/usr/src/app/sessions \
      -e PERSISTENT_SESSION_DIR=/usr/src/app/sessions \
      --restart always \
      azure-whatsapp-service
    ```
    This guarantees that the authorization tokens remain saved on Azure persistent disks even if the Docker container is recreated or restarted.

---

## 🔗 Backend ↔ WhatsApp API Calls

The Backend communicates with the Azure service via Axios. Keep this communication secure and handle network failures gracefully.

```javascript
const axios = require('axios');

const WHATSAPP_SERVICE_URL = process.env.SESSION_MANAGER_URL;

async function startWhatsAppSession(userId) {
    try {
        const response = await axios.post(`${WHATSAPP_SERVICE_URL}/sessions/start/${userId}`, {}, {
            timeout: 10000 // 10s timeout
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Failed to request WhatsApp startup for user ${userId}:`, error.message);
        throw new Error('WhatsApp service currently unavailable.');
    }
}

async function getWhatsAppQR(userId) {
    try {
        const response = await axios.get(`${WHATSAPP_SERVICE_URL}/sessions/qr/${userId}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return { qr: null, message: 'QR Code is generating...' };
        }
        throw error;
    }
}
```

---

## 🟢 Supabase Connection (Backend)

We connect to Supabase PostgreSQL using connection pooling in production:

### Connection String Setup
In production, use the **Connection Pooler** URI (transaction-mode) for serverless environments (like Render), which defaults to port `6543`.

```
DATABASE_URL=postgresql://postgres.[username]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### Secure Credentials (Anon vs Service Role)
*   **Anon Key**: Safe to expose in public frontend apps (like React and Mobile). It obeys Row-Level Security (RLS) policies set in the PostgreSQL tables.
*   **Service Role Key**: **NEVER** expose to the client. Keep this strictly inside your backend environment variables. It bypasses all RLS policies and grants full admin write/read rights. Use this key for background syncs, cron jobs, and admin dashboards only.

---

## 📱 Expo Mobile App Configuration

### 1. Endpoint Configuration
Create an `.env` file at the root of `chatnalyxer-mobile/`:
```env
EXPO_PUBLIC_API_URL=https://chatnalyzer-backend.onrender.com
```

In your mobile code (`src/config.ts`):
```typescript
// Expo automatically injects variables prefixed with EXPO_PUBLIC_ during compilation
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
```

### 2. Production Build using EAS (Expo Application Services)
1.  Install the CLI globally:
    ```bash
    npm install -g eas-cli
    ```
2.  Login to Expo:
    ```bash
    eas login
    ```
3.  Initialize the build config:
    ```bash
    eas build:configure
    ```
4.  Configure `eas.json` (add env variables to production profile):
    ```json
    {
      "build": {
        "production": {
          "env": {
            "EXPO_PUBLIC_API_URL": "https://chatnalyzer-backend.onrender.com"
          }
        }
      }
    }
    ```
5.  Trigger build for Android/iOS:
    ```bash
    eas build --platform android --profile production
    ```

---

## 🔐 Security Best Practices

*   **CORS Configuration**: Restrict origins to prevent scripting attacks. In Express:
    ```javascript
    app.use(cors({
        origin: ['https://admin.chatnalyzer.com', 'https://chatnalyzer.com'],
        credentials: true
    }));
    ```
*   **Secret Management**: Do not upload `.env` files to git. Add `*.env` and `.env.*` to your `.gitignore`.
*   **Use GitHub Secret Scanning**: Set up branch rules to block commits containing plaintext strings like API keys or JWT secret tokens.

---

## ⚠️ Common Production Pitfalls

1.  **Using Ephemeral Storage for Sessions**: Storing Baileys sessions inside an unmapped container folder will log out all users every time the service re-deploys or restarts. Ensure a persistent host directory is mounted (`-v` volume mount) on the Azure VM.
2.  **Hardcoding Localhost**: Hardcoding URLs like `http://localhost:3002` will break inside container networks. Use internal DNS names (e.g. `http://session-manager:3002`) inside Docker networks and environment variables in the code.
3.  **Hardcoding Ports**: Render assigns ports dynamically using `process.env.PORT`. Ensure your servers bind to `process.env.PORT` instead of hardcoding `8000` or `3001`.
4.  **Database Connection Exhaustion**: Opening raw database connections directly per request can exhaust pool limits quickly. Use connection pooling (like Supabase PgBouncer pooler on port `6543`) to queue database connections.

---

## 🎁 Deployment Checklist

- [ ] Connect Supabase Database Pooler on Port `6543` and run SQL migration schemas.
- [ ] Mount persistent data disk `/mnt/whatsapp-data` on Azure VM.
- [ ] Run `azure-whatsapp-service` docker container with host volume mounts.
- [ ] Configure Backend environment variables on Render (adding secrets and the Azure IP endpoint).
- [ ] Configure React Admin Dashboard environment variables and deploy to Render (Docker Runtime).
- [ ] Update `EXPO_PUBLIC_API_URL` inside `eas.json` and compile production APKs using EAS Build.
