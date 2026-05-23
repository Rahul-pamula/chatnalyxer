# Setup Guide for New PC

Follow these steps to run the project on a new machine.

## 1. Prerequisites
Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (Use version 18 or higher)
*   [Python 3.10+](https://www.python.org/)
*   [Git](https://git-scm.com/)

## 2. Installation
Open your terminal in the project folder and run:

### Mac / Linux
```bash
sh scripts/install_dependencies.sh
```

### Windows (Command Prompt)
```cmd
scripts\install_dependencies.bat
```

This will automatically create the Python virtual environment and install all libraries for the Backend, Admin Dashboard, and Mobile App.

## 3. Starting the App
Run the universal start script:

### Mac / Linux
```bash
sh scripts/start_all.sh
```

### Windows (Command Prompt)
Double-click `scripts\start_all.bat` or run:
```cmd
scripts\start_all.bat
```

## 4. Troubleshooting Common Issues

### ⚠️ "Port Issues" / "Address already in use"
If you see errors like `EADDRINUSE: 3001` or `Only one usage of each socket address`, it means another program (or an old version of this app) is already using that port.

**Solution:**
The `start_all.sh` script tries to fix this automatically, but if it fails:
1.  **Kill processes manually:**
    ```bash
    killof node
    killof uvicorn
    # OR on Mac:
    lsof -ti:8000,3001,3002 | xargs kill -9
    ```
2.  **Change Ports (if needed):**
    *   **Backend:** Edit `scripts/start_all.sh` line `uvicorn ... --port 8000`.
    *   **Admin Dashboard:** Edit `admin-whatsapp-otp/admin-dashboard.js` (look for `app.listen(3001)`).
    *   **Session Manager:** Edit `user-whatsapp-sessions/session-manager.js` (look for `PORT = 3002`).

### 📱 "Expo App Not Working" on Phone
If the Expo app works on your PC simulator but fails on your physical phone (Network Error / Unreachable):

**Reason:** Your phone cannot reach `localhost`. It needs your PC's **LAN IP** (e.g., `192.168.1.5`).

**Solutions:**
1.  **Use Tunnel Mode (Recommended):**
    In `scripts/start_all.sh`, change:
    ```bash
    npx expo start
    ```
    to:
    ```bash
    npx expo start --tunnel
    ```
    *This creates a public URL accessible from any network.*

    **⚠️ IMPORTANT:** If you use Tunnel, your backend must ALSO be public!
    1.  Install [ngrok](https://ngrok.com/).
    2.  Run `ngrok http 8000` to expose your backend.
    3.  Copy the `https://....ngrok-free.app` URL.
    4.  Update `chatnalyxer-mobile/src/config.ts`:
        ```typescript
        export const BASE_URL = 'https://your-url.ngrok-free.app';
        ```

2.  **Use LAN IP:**
    *   Connect phone and PC to the **same WiFi**.
    *   Check your IP (`ipconfig` or `ifconfig`).
    *   Update `chatnalyxer-mobile/src/config.ts`:
        ```typescript
        // Don't use localhost! Use your computer's IP
        export const BASE_URL = 'http://192.168.1.X:8000'; 
        ```
    *   Disable your PC's firewall if connection is blocked.
