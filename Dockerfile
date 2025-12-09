# Use Python 3.9 as base
FROM python:3.9-slim

WORKDIR /app

# 1. Install System Dependencies (Chrome, Node.js, Python build tools)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    gcc \
    curl \
    unzip \
    xvfb \
    libxi6 \
    libgconf-2-4 \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install Google Chrome Stable (for Puppeteer)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup Backend
COPY chatnalyxer-backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# 3. Setup Node.js Service (WhatsApp Integration)
COPY whatsapp-integration/package*.json ./whatsapp-integration/
WORKDIR /app/whatsapp-integration
RUN npm install
# Install Puppeteer and dependencies explicitly if needed, but package.json should cover it.
# We might need to force puppeteer to use installed chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

WORKDIR /app

# 4. Copy Code
COPY chatnalyxer-backend ./backend
COPY whatsapp-integration ./whatsapp-integration

# 5. Environment Variables
ENV PYTHONPATH=/app/backend

# 6. Expose Port
EXPOSE 8000
EXPOSE 3000

# 7. Start Command
# We run the backend, which will spawn the node process internally via subprocess
WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
