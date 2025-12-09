# Zero-Cost Deployment with InstaTunnel (Recommended)

## 🚀 Why Use InstaTunnel?
**Problem:** Public cloud providers (AWS, GCP, Render) require a **credit card** for verification and offer limited free tiers (often 512MB RAM), which is insufficient for Chatnalyxer's WhatsApp integration. The WhatsApp service runs a headless Chrome browser that needs **2GB+ RAM** and **persistent storage** to keep your session alive—features that are expensive in the cloud but free on your local machine.

**Solution:** **InstaTunnel** allows you to host the application on your powerful laptop while securely exposing it to the internet for mobile testing. It bypasses the need for credit cards, expensive cloud VMs, and complex configurations.

| Feature | Cloud Free Tier | InstaTunnel (Local Host) | Benefit |
| :--- | :--- | :--- | :--- |
| **RAM / Performance** | ~512MB (Crashes Chrome) | Your Laptop (8GB+) | **No Crashes:** Smooth WhatsApp automation. |
| **Session Persistence** | Ephemeral (Wipes data) | Persistent Local Disk | **Stable Login:** WhatsApp stays connected. |
| **Cost & Requirements** | Credit Card Required | **Free & No Card** | **Accessible:** Instant setup for students. |

## 🛠️ Deployment Steps

### 1. Install & Run Docker Locally
Ensure your backend and database are running on your machine.
```bash
# In your project root
docker-compose up -d --build
```
*Creates the backend service on port 8000.*

### 2. Start InstaTunnel
Expose your local backend (port 8000) to the public internet securely.
```bash
# Install (if not already installed) & Run
npm install -g instatunnel
instatunnel --port 8000 --subdomain chatnalyxer-demo
```
*Output Example:* `https://chatnalyxer-demo.instatunnel.com`

### 3. Update Mobile App Configuration
Point your mobile app to the new secure public URL.
**File:** `chatnalyxer-mobile/src/config.ts`
```typescript
// Update the BASE_URL to your InstaTunnel HTTPS link
export const BASE_URL = "https://chatnalyxer-demo.instatunnel.com";
```
*Reload your mobile app (shake device or press 'r') and you are live!*
