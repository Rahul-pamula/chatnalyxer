# Deploying Chatnalyxer

> **RECOMMENDED FOR STUDENTS:** Check out [Zero-Cost Deployment with InstaTunnel](./INSTATUNNEL_GUIDE.md) for a free, persistent, and high-performance way to demo this app without a credit card.

# Deploying Chatnalyxer to Google Cloud Platform (GCP)

This guide will help you deploy Chatnalyxer to a **Google Compute Engine (VM)** instance. This method ensures persistent storage for WhatsApp sessions and is cost-effective.

## Prerequisites
1.  A Google Cloud Platform Account.
2.  A Project created in GCP Console.
3.  Billing enabled.

## Step 1: Create a VM Instance
1.  Go to **Compute Engine** > **VM Instances**.
2.  Click **Create Instance**.
3.  **Name**: `chatnalyxer-server`
4.  **Region**: Choose one close to you (e.g., `us-central1` or `asia-south1`).
5.  **Machine Type**: `e2-medium` (2 vCPU, 4GB Memory) or `e2-small` (if on a tight budget, but `medium` is safer for Chrome/Puppeteer).
6.  **Boot Disk**:
    - Change to **Ubuntu 20.04 LTS** or **Debian 11**.
    - Size: **20 GB** (Standard).
7.  **Firewall**: Check **Allow HTTP traffic** and **Allow HTTPS traffic**.
8.  Click **Create**.

## Step 2: Configure Firewall (Open Port 8000)
By default, GCP allows port 80/443. We need to allow port **8000** for the backend API.
1.  Go to **VPC Network** > **Firewall**.
2.  Click **Create Firewall Rule**.
3.  **Name**: `allow-chatnalyxer-8000`
4.  **Targets**: `All instances in the network`
5.  **Source IPv4 ranges**: `0.0.0.0/0` (Allow from anywhere)
6.  **Protocols and ports**: TCP: `8000`
7.  Click **Create**.

## Step 3: Install Docker on the VM
1.  SSH into your new VM (Click the **SSH** button in the GCP Console).
2.  Run the following commands to install Docker and Docker Compose:
    ```bash
    # Update and install Docker
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose

    # Verify installation
    sudo docker --version
    sudo docker-compose --version

    # Add your user to docker group (avoids using sudo)
    sudo usermod -aG docker $USER
    # You might need to logout and log back in for this to take effect, or just use 'sudo' for now.
    ```

## Step 4: Upload Code to VM
You can use `git clone` if your code is on GitHub, or upload manually directly via the SSH window (Gear icon > Upload file) if supported, or use `scp`.

**Option A: Git (Recommended)**
1.  Push your code to a GitHub repo (ensure secrets are NOT committed).
2.  Clone it on the VM:
    ```bash
    git clone https://github.com/your-username/chatnalyxer.git
    cd chatnalyxer
    ```

**Option B: SCP (Local Upload)**
Run this from your **local terminal** (not inside the VM SSH):
```bash
# Zip your project first
zip -r chatnalyxer.zip . -x "node_modules/*" "venv/*" "__pycache__/*"

# Upload to VM (Replace IP_ADDRESS with your VM's External IP)
gcloud compute scp chatnalyxer.zip username@instance-name:~/
```

## Step 5: Configure Environment
1.  Create/Edit the `.env` file in the project directory:
    ```bash
    nano chatnalyxer-backend/.env
    # Paste your environment variables here
    ```
2.  Create the `docker-compose.yml` (if not uploaded) or verify it exists.

## Step 6: Deploy!
Run the application using Docker Compose:
```bash
sudo docker-compose up -d --build
```
- `up`: Starts the containers.
- `-d`: Detached mode (runs in background).
- `--build`: Rebuilds the images.

### Check Status
```bash
sudo docker-compose ps
sudo docker-compose logs -f
```

## Step 7: Connect
Your API is now available at:
`http://<VM_EXTERNAL_IP>:8000`

**Mobile App Config:**
Update your `config.ts` in the mobile app to point to this new IP:
```typescript
export const BASE_URL = "http://<VM_EXTERNAL_IP>:8000";
```
