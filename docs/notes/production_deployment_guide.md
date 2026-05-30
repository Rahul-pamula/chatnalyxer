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
*   **Default Port:** `8080` (overridden via `$PORT` by Render)
*   **Health Check Path:** `/health` (Must be `/health`—FastAPI has no `/healthz` route, so `/healthz` will return `404 Not Found` and fail the deployment!)

### Render Dashboard Configuration:

To deploy the backend, choose **ONE** of the following configuration options on Render:

| Render Dashboard Field | Option A: Monorepo Root Directory (Recommended) | Option B: Repo-Root Build (Alternative) |
| :--- | :--- | :--- |
| **Root Directory** | `chatnalyxer-backend` | *(Leave blank / empty)* |
| **Runtime** | `Docker` | `Docker` |
| **Docker Build Context Directory** | *(Leave blank - defaults to `.`)* | `chatnalyxer-backend` |
| **Dockerfile Path** | *(Leave blank - defaults to `Dockerfile`)* | `chatnalyxer-backend/Dockerfile` |
| **Health Check Path** | `/health` | `/health` |

> [!WARNING]
> **Why your screenshot configuration will fail:**
> 1. **Dockerfile Path:** You typed `chatnalyxer-backend/`. Render expects a path to the **file itself**, not a directory. It must be `chatnalyxer-backend/Dockerfile` (Option B) or you must set Root Directory and leave Dockerfile Path blank (Option A).
> 2. **Health Check Path:** You typed `/healthz`. The backend code only defines `/health` and `/` routes. Setting it to `/healthz` will cause Render to constantly fail health checks and roll back your deployment.

#### Environment Variables (under **Environment** tab):
*   `DATABASE_URL`: Your Supabase connection pooler URI on port `6543` (e.g., `postgresql://postgres.[db-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`)
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
*   **Health Check Path:** `/` (Nginx returns `index.html` for any request not matching a static file)

### Render Dashboard Configuration:

| Render Dashboard Field | Option A: Monorepo Root Directory (Recommended) | Option B: Repo-Root Build (Alternative) |
| :--- | :--- | :--- |
| **Root Directory** | `chatnalyxer-mobile` | *(Leave blank / empty)* |
| **Runtime** | `Docker` | `Docker` |
| **Docker Build Context Directory** | *(Leave blank - defaults to `.`)* | `chatnalyxer-mobile` |
| **Dockerfile Path** | *(Leave blank - defaults to `Dockerfile`)* | `chatnalyxer-mobile/Dockerfile` |
| **Health Check Path** | `/` | `/` |

#### Environment Variables:
*   `EXPO_PUBLIC_API_URL`: `https://chatnalyzer-backend.onrender.com` (Your deployed backend URL)
*   *Note: Expo will automatically embed any environment variables starting with `EXPO_PUBLIC_` during the compilation stage (`npx expo export`).*

---

## 🐳 Service 3: User Sessions Manager (`user-whatsapp-sessions`)
*   **Runtime:** Node.js 20 (Express + Baileys WhatsApp client)
*   **Default Port:** `3002` (overridden via `$PORT`)
*   **Health Check Path:** `/health` (Returns JSON with `uptime` and status)
*   **Persistence Requirement:** Requires a mapped storage disk for persistent auth tokens.

### Render Dashboard Configuration:

| Render Dashboard Field | Option A: Monorepo Root Directory (Recommended) | Option B: Repo-Root Build (Alternative) |
| :--- | :--- | :--- |
| **Root Directory** | `user-whatsapp-sessions` | *(Leave blank / empty)* |
| **Runtime** | `Docker` | `Docker` |
| **Instance Type** | **Starter** *(Required for persistent disks)* | **Starter** *(Required for persistent disks)* |
| **Docker Build Context Directory** | *(Leave blank - defaults to `.`)* | `user-whatsapp-sessions` |
| **Dockerfile Path** | *(Leave blank - defaults to `Dockerfile`)* | `user-whatsapp-sessions/Dockerfile` |
| **Health Check Path** | `/health` | `/health` |

#### Environment Variables:
*   `DATABASE_URL`: Your Supabase connection pooler URI
*   `BACKEND_URL`: `https://chatnalyzer-backend.onrender.com`

#### Configure Persistent Disk:
1. Scroll down to the **Disks** section in Render.
2. Click **Add Disk**.
3. Set the fields:
   *   **Name:** `whatsapp-sessions-disk`
   *   **Mount Path:** `/app/sessions`
   *   **Size:** `1 GB` (More than enough for storing multi-user QR/pairing session states).

---

## 🐳 Service 4: Admin OTP Dashboard (`admin-whatsapp-otp`)
*   **Runtime:** Node.js 20 (Express + WhatsApp Client)
*   **Default Port:** `3001` (overridden via `$PORT`)
*   **Health Check Path:** `/` (Returns the admin login HTML panel)

### Render Dashboard Configuration:

| Render Dashboard Field | Option A: Monorepo Root Directory (Recommended) | Option B: Repo-Root Build (Alternative) |
| :--- | :--- | :--- |
| **Root Directory** | `admin-whatsapp-otp` | *(Leave blank / empty)* |
| **Runtime** | `Docker` | `Docker` |
| **Docker Build Context Directory** | *(Leave blank - defaults to `.`)* | `admin-whatsapp-otp` |
| **Dockerfile Path** | *(Leave blank - defaults to `Dockerfile`)* | `admin-whatsapp-otp/Dockerfile` |
| **Health Check Path** | `/` | `/` |

#### Environment Variables:
*   `DATABASE_URL`: Your Supabase connection pooler URI
*   `BACKEND_URL`: `https://chatnalyzer-backend.onrender.com`
*   `SESSION_MANAGER_URL`: `https://chatnalyzer-sessions.onrender.com`
*   `ADMIN_USERNAME`: `admin` (Or your custom admin email/username)
*   `ADMIN_PASSWORD`: `your_secure_password` (Override the default `admin123` password)

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
