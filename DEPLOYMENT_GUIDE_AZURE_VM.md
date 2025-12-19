# Deploying Chatnalyxer to Azure (Student VM Method) ☁️🎓

This guide is optimized for the **Microsoft Imagine Cup** using your **Azure for Students** credits ($100).
We will use a **Single Virtual Machine (Ubuntu)** to host everything. This acts just like your local computer but runs 24/7 in the cloud.

---

## 🏗️ Step 1: Create Azure Virtual Machine

1.  Log in to [Azure Portal](https://portal.azure.com/).
2.  Search for **"Virtual Machines"** and click **Create > Azure Virtual Machine**.
3.  **Basics Tab:**
    *   **Subscription:** Azure for Students
    *   **Resource Group:** Create new (e.g., `Chatnalyxer-RG`)
    *   **Virtual Machine Name:** `chatnalyxer-server`
    *   **Region:** Choose closest to you (e.g., `(Asia Pacific) Central India`)
    *   **Image:** `Ubuntu Server 22.04 LTS - Gen2`
    *   **Size:**
        *   Recommended: **Standard_B2s** (2 vCPUs, 4GB RAM) - Costs ~$30/month (covered by credits).
        *   Minimum: **Standard_B1s** (1 vCPU, 1GB RAM) - Might be slow for building UI.
    *   **Authentication Type:** `Password` (Choose a strong password).
    *   **Inbound Port Rules:** Select `HTTP (80)`, `HTTPS (443)`, `SSH (22)`.
4.  **Networking Tab:**
    *   Keep defaults.
5.  **Review + Create:**
    *   Click "Create". Wait for deployment to finish.

---

## 🌐 Step 2: Open Ports (Firewall)
By default, custom ports like 8000 (Backend) and 3001 (WhatsApp) are blocked.

1.  Go to your new VM resource.
2.  In left menu, click **Networking** (or "Network Settings").
3.  Click **"Create port rule"** (Inbound).
4.  Add Rule 1:
    *   **Destination Port Ranges:** `8000`
    *   **Protocol:** TCP
    *   **Name:** `Allow_Backend`
5.  Add Rule 2:
    *   **Destination Port Ranges:** `3001`
    *   **Protocol:** TCP
    *   **Name:** `Allow_WhatsApp`
6.  Click **Add**.

---

## 💻 Step 3: Connect to VM

1.  Get your **Public IP Address** from the VM Overview page.
2.  Open your Terminal (Mac/PC) and run:
    ```bash
    ssh azureuser@<YOUR_VM_IP>
    ```
    *(Replace `azureuser` if you chose a different username).*
3.  Enter the password you created.

---

## 🛠️ Step 4: One-Click Setup (On the VM)

Once logged into the VM via SSH, run this command to install **Python, Node.js, and PM2**:

```bash
# Update and install basics
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv git nodejs npm nginx

# Install Global Node Tools
sudo npm install -g n pm2

# Upgrade Node to latest stable
sudo n stable
hash -r
```

---

## 🚀 Step 5: Deploy Code

### 1. Clone Repository
```bash
git clone https://github.com/Rahul-pamula/chatnalyxer.git
cd chatnalyxer
```

### 2. Setup Backend (FastAPI)
```bash
cd chatnalyxer-backend

# Create Virtual Env
python3 -m venv venv
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt
pip install pymupdf  # Ensure PDF handling tool is installed

# Create .env file
nano .env
# PASTE YOUR CONTENT FROM LOCAL .env HERE
# (Ctrl+O to Save, Enter, Ctrl+X to Exit)

# Start Backend with PM2
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name backend
```

### 3. Setup WhatsApp Service
```bash
cd ../whatsapp-integration

# Install Dependencies
npm install

# Start WhatsApp Service with PM2
pm2 start otp-service.js --name whatsapp-bot -- 36  
# (Replace 36 with your actual User ID if different)
```

### 4. Save Processes
```bash
pm2 save
pm2 startup
# Run the command PM2 tells you to run to make it auto-start on reboot
```

---

## ✅ Step 6: Verification

1.  **Backend:** Visit `http://<VM_IP>:8000/docs`. You should see Swagger UI.
2.  **WhatsApp Dashboard:** Visit `http://<VM_IP>:3001`. You should see the Admin Panel.
    *   Link your WhatsApp there!

---

## 📱 Mobile App Config

Since you are not deploying the mobile app to a store yet, you just need to point it to your new Cloud Server.

1.  Open `chatnalyxer-mobile/src/config.ts` on your **Laptop**.
2.  Change `BASE_URL`:
    ```typescript
    export const BASE_URL = "http://<YOUR_VM_IP>:8000";
    ```
3.  Run the app locally (`npm start`) and it will connect to the Cloud Backend!

---

## 🔄 How to Update Code (Redeploy)

When you make changes on your laptop:

1.  **Push** changes to GitHub:
    ```bash
    git add .
    git commit -m "Fixed something"
    git push
    ```

2.  **Pull** changes on the Server:
    ```bash
    ssh azureuser@<VM_IP>
    cd chatnalyxer
    git pull
    
    # Restart to apply changes
    pm2 restart all
    ```
    
That's it! Your changes are live in seconds. ⚡
