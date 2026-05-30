# 🐳 Docker Compose Cheat Sheet & Guide

This guide describes how to manage, monitor, and troubleshoot the containerized Chatnalyxer services.

## 🌐 Port Mappings & Service URLs

Once the stack is running, you can access the services at the following local URLs:

*   **Mobile Web App (Frontend):** [http://localhost:8081](http://localhost:8081)
*   **Admin Dashboard (Frontend & OTP Service):** [http://localhost:3001](http://localhost:3001)
*   **Backend API (Swagger Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)
*   **WhatsApp Session Manager API:** [http://localhost:3002](http://localhost:3002)

---

## 🚀 Starting Services

To build the images and run all services in the background (detached mode):
```bash
docker compose up -d
```

### Rebuilding Images
If you update `package.json` dependencies, `requirements.txt`, or any of the `Dockerfile` configurations, force a rebuild using:
```bash
docker compose up -d --build
```

---

## 🛑 Stopping & Ending Services

### Stop Services (Keep Containers)
To stop the services without deleting the containers (saves state and allows quick restarts):
```bash
docker compose stop
```

### Down Services (Remove Containers & Networks)
To stop the containers, remove them, and tear down the virtual network:
```bash
docker compose down
```

### Down and Remove Volumes
To tear down everything and clean up any persistent volume storage:
```bash
docker compose down -v
```

---

## 📋 Viewing Logs

### View All Logs
To view combined logs from all services:
```bash
docker compose logs
```

### Follow All Logs (Live)
To stream live logs from all running services:
```bash
docker compose logs -f
```

### Follow Logs of a Specific Service
To monitor only a single service (e.g. `backend`, `session-manager`, `admin-dashboard`):
```bash
docker compose logs -f backend
docker compose logs -f session-manager
docker compose logs -f admin-dashboard
```

---

## 🔍 Diagnostics & Status

### Check Running Containers
To list all active containers, their statuses, and port mappings:
```bash
docker compose ps
```

### Troubleshooting: Container Name/Port Conflicts
If containers fail to start because of stale resources or name conflicts:
1. Stop and remove the compose stack:
   ```bash
   docker compose down
   ```
2. Force delete the conflicting container:
   ```bash
   docker rm -f chatnalyxer-backend-1
   ```
3. Restart the stack:
   ```bash
   docker compose up -d
   ```
