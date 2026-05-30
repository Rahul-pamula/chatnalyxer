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

---

## 🔒 Security Checklist for Production

*   **Ignore Environment Files**: Add `.env` to your root `.gitignore`. Never commit API keys, passwords, or Supabase credentials.
*   **Production Database Pooler**: Always use Supabase Pooler (`port 6543`) on Render or VPS.
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
*   **Change Default Admin Credentials**: Override `admin` and `admin123` via environment variables (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).

---

## 💰 Production Cost & Budget Estimation (GitHub Developer Credits)

For running a cost-effective, high-availability production cluster during early-stage testing and operations, we can leverage developer credits (such as the GitHub Student/Developer Pack) to achieve a zero-cost, always-on environment:

### 📊 Cost Breakdown Table

| Component | Provider / Service | Specs / Details | Monthly Cost | Developer Pack / Free Tier Benefit |
| :--- | :--- | :--- | :--- | :--- |
| **Server & Containers** | DigitalOcean (Droplet) | 2 GB RAM / 1 vCPU / 50 GB SSD | **$0.00** *(Deducted)* | $200 DO credit covers this $12/mo plan for **16 Months**. |
| **Database** | Supabase | Postgres Database (500MB storage) | **$0.00** | Covered under Supabase Free Tier. |
| **Domain Name** | Namecheap or Name.com | Custom Domain (e.g., `.me`, `.tech`) | **$0.00** | Free 1-year domain name via Developer Pack. |
| **SSL Certificate** | Let's Encrypt | HTTPS Certificate for 4 subdomains | **$0.00** | Always free and auto-renewed via Certbot. |
| **App Builds** | Expo EAS | Native Android/iOS builds | **$0.00** | Free Tier allows up to 30 cloud builds/month. |
| **TOTAL OUT-OF-POCKET** | | | **$0.00** | **100% Free live hosting for the entire year!** |

> [!TIP]
> **Why this setup is preferred for High-Availability Demos:**
> * **No Cold Starts:** Free container hosts (like Render Free Tier) spin down after 15 minutes of inactivity. This VPS setup is **always awake**, loading the API and frontend pages instantly in milliseconds.
> * **Free WhatsApp Sessions:** A single $12/mo VPS runs all 4 containers and persistent storage locally. On Render, you would have to pay a minimum of $7/mo for a Starter instance just to mount a storage disk for WhatsApp keys.

---

## 💧 Option C: DigitalOcean Droplet Deployment (Recommended & Cost-Effective)

Deploying all 4 services on a single DigitalOcean Droplet (VPS) is the most budget-friendly and robust option. You can host everything on a single **$4 - $6/month (1GB RAM / 1 vCPU / Ubuntu)** Droplet. 

### Step 1: Create a DigitalOcean Droplet
1. Log in to your DigitalOcean account.
2. Click **Create > Droplets**.
3. Choose **Region** (closest to your users).
4. Choose **OS**: **Ubuntu 22.04 LTS** (or select **Docker on Ubuntu** from the Marketplace tab to skip Step 2).
5. Choose **Size**: **Basic Plan (Regular CPU)** - `$4/mo` or `$6/mo` (1GB RAM, 1 CPU, 25GB SSD is plenty to start).
6. Set **Authentication**: SSH keys (recommended) or Root Password.
7. Click **Create Droplet**.

---

### Step 2: Install Docker & Docker Compose (If using clean Ubuntu)
SSH into your Droplet (`ssh root@your_droplet_ip`) and run:
```bash
# Update package database
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose v2
sudo apt install docker-compose-v2 -y
```

---

### Step 3: Clone Code & Configure Production `.env`
1. Clone your project repository onto the server:
   ```bash
   git clone https://github.com/your-username/chatnalyxer.git /var/www/chatnalyxer
   cd /var/www/chatnalyxer
   ```
2. Create and configure `.env` files in each subfolder. Ensure they point to production resources:
   * **Backend** (`/var/www/chatnalyxer/chatnalyxer-backend/.env`):
     ```env
     DATABASE_URL=postgresql://postgres.[db-id]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
     SESSION_MANAGER_URL=http://localhost:3002
     OTP_SERVICE_URL=http://localhost:3001
     GOOGLE_API_KEY=your_gemini_key
     ```
   * **Sessions** (`/var/www/chatnalyxer/user-whatsapp-sessions/.env`):
     ```env
     DATABASE_URL=your_supabase_pooler_url
     BACKEND_URL=http://localhost:8000
     ```
   * **Admin** (`/var/www/chatnalyxer/admin-whatsapp-otp/.env`):
     ```env
     DATABASE_URL=your_supabase_pooler_url
     BACKEND_URL=http://localhost:8000
     SESSION_MANAGER_URL=http://localhost:3002
     ADMIN_USERNAME=admin
     ADMIN_PASSWORD=your_secure_password
     ```

---

### Step 4: Configure Production `docker-compose.yml` (With Session Storage)
To prevent users and admin accounts from logging out of WhatsApp every time containers restart, map **Docker Volumes** for Baileys auth credentials.

Create or update `/var/www/chatnalyxer/docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./chatnalyxer-backend
      dockerfile: Dockerfile
    ports:
      - "127.0.0.1:8000:8000" # Expose only locally (Nginx handles public access)
    environment:
      - PORT=8000
    env_file:
      - ./chatnalyxer-backend/.env
    restart: always

  session-manager:
    build:
      context: ./user-whatsapp-sessions
      dockerfile: Dockerfile
    ports:
      - "127.0.0.1:3002:3002"
    env_file:
      - ./user-whatsapp-sessions/.env
    volumes:
      # CRITICAL: Persist user WhatsApp session keys
      - ./sessions:/app/sessions
    restart: always

  admin-dashboard:
    build:
      context: ./admin-whatsapp-otp
      dockerfile: Dockerfile
    ports:
      - "127.0.0.1:3001:3001"
    env_file:
      - ./admin-whatsapp-otp/.env
    volumes:
      # CRITICAL: Persist admin WhatsApp credentials
      - ./admin-wa-auth:/app/admin-wa-auth
    restart: always

  mobile-web:
    build:
      context: ./chatnalyxer-mobile
      dockerfile: Dockerfile
    ports:
      - "127.0.0.1:8081:8080"
    restart: always
```

Start the containers:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

### Step 5: Install Nginx & Set Up Reverse Proxy with SSL (Certbot)
We want Nginx to listen on ports 80/443 and direct traffic to our Docker containers locally, providing HTTPS SSL validation.

1. **Install Nginx & Certbot**:
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx -y
   ```
2. **Configure Nginx Server Blocks**:
   Create a configuration file `sudo nano /etc/nginx/sites-available/chatnalyxer`:
   ```nginx
   # 1. Expo Frontend Web (app.yourdomain.com)
   server {
       listen 80;
       server_name app.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:8081;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

   # 2. FastAPI Backend (api.yourdomain.com)
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

   # 3. User Session Manager (sessions.yourdomain.com)
   server {
       listen 80;
       server_name sessions.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3002;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

   # 4. Admin OTP Dashboard (admin.yourdomain.com)
   server {
       listen 80;
       server_name admin.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. **Enable configuration and restart Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/chatnalyxer /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
4. **Acquire Let's Encrypt SSL Certificates**:
   Run Certbot to secure all subdomains automatically:
   ```bash
   sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com -d sessions.yourdomain.com -d admin.yourdomain.com
   ```
   *Certbot will automatically obtain certificates and modify Nginx to force redirect all HTTP traffic to secure HTTPS!*

---

### Step 6: Verify Deployment
* **Frontend UI**: Check `https://app.yourdomain.com`
* **FastAPI Docs**: Check `https://api.yourdomain.com/docs`
* **Sessions Status**: Check `https://sessions.yourdomain.com/health`
* **Admin Login**: Check `https://admin.yourdomain.com`

*To check live Docker logs on the VPS:*
```bash
docker compose -f docker-compose.prod.yml logs -f --tail 100
```
