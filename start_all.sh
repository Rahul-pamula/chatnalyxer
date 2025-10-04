#!/bin/bash

# Start the backend
cd chatnalyxer-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload &

# Start the QR server
cd ..
node qr-server.js &

# Start the frontend
cd chatnalyxer-mobile
npm install
npm start &

# Start the WhatsApp integration in a new terminal window
osascript -e '
  tell application "Terminal"
    activate
    do script "cd /Users/pamula/Desktop/chatnalyxer/whatsapp-integration && npm install && node index.js"
  end tell
' &
