# 🚀 Chatnalyzer Production Deployment Guide (4 Docker Services)

This guide explains how to deploy all four services of the Chatnalyzer application to production on **Render** using your exact Dockerfiles.

---

## 📊 Monorepo Architecture Overview

Here is how the four containerized services interact with each other and your database:

```
                               ┌───► [ chatnalyxer-mobile (Expo Web) ] (Port 8080)
                               │
[ Client / Browser Request ] ──┼───► [ admin-whatsapp-otp (Admin Web) ] (Port 3001)
                               │
                               └───► [ chatnalyxer-backend (FastAPI) ] (Port 8080)
                                            │
                                            ├─► [ Supabase (Postgres) ]
                                            │
                                            └─► [ user-whatsapp-sessions (WhatsApp Core) ] (Port 3002)
                                                      │
                                                      └──► [ Render Persistent Disk ] (auth_info/)
```

---

## 🐳 Service 1: Backend (`chatnalyxer-backend`)
*   **Runtime:** Python 3.11 (FastAPI / Uvicorn)
*   **Default Port:** `8080` (overridden via `$PORT`)
*   **Dockerfile Path:** `chatnalyxer-backend/Dockerfile`

### Render Deployment Instructions:
1.  On the Render Dashboard, click **New > Web Service**.
2.  Connect your GitHub repository.
3.  Configure the service details:
    *   **Name:** `chatnalyzer-backend`
    *   **Root Directory:** `chatnalyxer-backend`
    *   **Runtime:** `Docker`
    *   **Instance Type:** Free (or Starter if scaling)
4.  Add the following **Environment Variables** under the **Environment** tab:
    *   `DATABASE_URL`: Your Supabase connection pooler URI on port `6543` (e.g. `postgresql://postgres.[db-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`)
    *   `SESSION_MANAGER_URL`: `https://chatnalyzer-sessions.onrender.com` (Your deployed user sessions URL)
    *   `OTP_SERVICE_URL`: `https://chatnalyzer-admin.onrender.com` (Your deployed admin dashboard URL)
    *   `GOOGLE_API_KEY`: Your Gemini API key
    *   `AZURE_VISION_KEY`, `AZURE_VISION_ENDPOINT`
    *   `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`
    *   `AZURE_DOC_INTELLIGENCE_KEY`, `AZURE_DOC_INTELLIGENCE_ENDPOINT`

---

## 🐳 Service 2: Frontend (`chatnalyxer-mobile`)
*   **Runtime:** Multi-stage Build (Expo web build compiled in Node → Hosted via Nginx)
*   **Default Port:** `8080` (overridden via `$PORT` dynamically in `sed` start command)
*   **Dockerfile Path:** `chatnalyxer-mobile/Dockerfile`

### Render Deployment Instructions:
1.  Click **New > Web Service**.
2.  Connect your GitHub repository.
3.  Configure the service details:
    *   **Name:** `chatnalyzer-mobile-web`
    *   **Root Directory:** `chatnalyxer-mobile`
    *   **Runtime:** `Docker`
4.  Add the following **Environment Variables**:
    *   `EXPO_PUBLIC_API_URL`: `https://chatnalyzer-backend.onrender.com` (Your deployed backend URL)
    *   *Note: Expo will automatically embed any environment variables starting with `EXPO_PUBLIC_` during the compilation stage (`npx expo export`).*

---

## 🐳 Service 3: User Sessions Manager (`user-whatsapp-sessions`)
*   **Runtime:** Node.js 20 (Express + Baileys WhatsApp client)
*   **Default Port:** `3002`
*   **Dockerfile Path:** `user-whatsapp-sessions/Dockerfile`
*   **Persistence Requirement:** Requires a mapped storage disk for persistent auth tokens.

### Render Deployment Instructions (Crucial for WhatsApp Session State):
1.  Click **New > Web Service**.
2.  Connect your GitHub repository.
3.  Configure the service details:
    *   **Name:** `chatnalyzer-sessions`
    *   **Root Directory:** `user-whatsapp-sessions`
    *   **Runtime:** `Docker`
    *   **Instance Type:** **Starter** (Render Free tier does *not* support persistent disks. You *must* use a Starter instance or higher so the disk is available).
4.  Add the following **Environment Variables**:
    *   `DATABASE_URL`: Your Supabase connection pooler URI
    *   `BACKEND_URL`: `https://chatnalyzer-backend.onrender.com`
5.  **Configure Persistent Disk**:
    *   Scroll down to the **Disks** section.
    *   Click **Add Disk**.
    *   **Name:** `whatsapp-sessions-disk`
    *   **Mount Path:** `/app/sessions`
    *   **Size:** `1 GB` (Plenty of space to store multi-user auth keys).
    *   *This disk maps directly to where the Express server writes user keys, preventing WhatsApp logouts on re-deployments.*

---

## 🐳 Service 4: Admin OTP Dashboard (`admin-whatsapp-otp`)
*   **Runtime:** Node.js 20 (Express + WhatsApp Client)
*   **Default Port:** `3001`
*   **Dockerfile Path:** `admin-whatsapp-otp/Dockerfile`

### Render Deployment Instructions:
1.  Click **New > Web Service**.
2.  Connect your GitHub repository.
3.  Configure the service details:
    *   **Name:** `chatnalyzer-admin`
    *   **Root Directory:** `admin-whatsapp-otp`
    *   **Runtime:** `Docker`
4.  Add the following **Environment Variables**:
    *   `DATABASE_URL`: Your Supabase connection pooler URI
    *   `BACKEND_URL`: `https://chatnalyzer-backend.onrender.com`
    *   `SESSION_MANAGER_URL`: `https://chatnalyzer-sessions.onrender.com`
    *   `ADMIN_USERNAME`: `admin` (or your custom credentials)
    *   `ADMIN_PASSWORD`: `your_secure_password`

---

## 🔗 How API Communication Works in Production

When deployed in separate Web Services on Render, containers cannot communicate using `localhost` or Docker Compose container names (like `http://session-manager:3002`). They must use the **public Render HTTPS URLs**:

*   **FastAPI Backend** sends requests to **User Sessions Manager**:
    ```python
    # Configured via the SESSION_MANAGER_URL environment variable
    requests.post(f"{SESSION_MANAGER_URL}/sessions/start/{user_id}")
    ```
*   **FastAPI Backend** sends requests to **Admin OTP Dashboard**:
    ```python
    # Configured via the OTP_SERVICE_URL environment variable
    requests.post(f"{OTP_SERVICE_URL}/send-otp")
    ```
*   **User Sessions Manager** sends webhook callbacks to **FastAPI Backend**:
    ```javascript
    // Configured via the BACKEND_URL environment variable
    axios.post(`${BACKEND_URL}/whatsapp/session-ended`, { user_id, reason });
    ```

---

## 🔒 Security Checklist for Production

*   **Ignore Environment Files**: Add `.env` to your root `.gitignore`. Never commit API keys, passwords, or Supabase credentials.
*   **Production Database Pooler**: Always use Supabase Pooler (`port 6543`) on Render. Render spinning down free services causes database connection cycles that can quickly exceed Supabase's max direct connection limits.
*   **Enable CORS Origins**: Restrict backend request acceptance to only your deployed frontend domains inside `app/main.py`:
    ```python
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://chatnalyzer-mobile-web.onrender.com", "https://chatnalyzer-admin.onrender.com"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    ```
*   **Change Default Admin Credentials**: Override `admin` and `admin123` via Render environment variables (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).
