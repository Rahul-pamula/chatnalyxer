#!/bin/bash

# Mobile Testing Tunnel Setup
# This creates a tunnel for mobile app while keeping backend on localhost

echo "📱 Starting Mobile Testing Tunnel Setup..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Install it from https://ngrok.com/download"
    exit 1
fi

# Check if backend is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "⚠️  Backend is not running on localhost:8000"
    echo "Starting backend..."
    cd chatnalyxer-backend
    source ../venv/bin/activate
    uvicorn app.main:app --host 0.0.0.0 --reload &
    BACKEND_PID=$!
    echo "✅ Backend started (PID: $BACKEND_PID)"
    cd ..
    sleep 3
fi

# Kill any existing ngrok processes
pkill -f ngrok
sleep 1

# Start ngrok tunnel for backend (port 8000)
echo "📡 Starting ngrok tunnel for backend (port 8000)..."
ngrok http 8000 --log=stdout > /tmp/ngrok-mobile.log &
NGROK_PID=$!

# Wait for ngrok to start
sleep 4

# Get the public URL
TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Failed to get ngrok URL. Check if ngrok is running."
    echo "Try visiting http://localhost:4040 to see ngrok status"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ MOBILE TUNNEL ACTIVE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Tunnel URL: $TUNNEL_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 CONFIGURATION UPDATES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Mobile App Config (chatnalyxer-mobile/src/config.ts):"
echo "   const TUNNEL_URL = \"$TUNNEL_URL\";"
echo "   export const BASE_URL = TUNNEL_URL;"
echo ""
echo "2️⃣  WhatsApp Integration (whatsapp-integration/config.js):"
echo "   export const BASE_URL = \"http://localhost:8000\";"
echo ""
echo "3️⃣  OTP Service URL (keep deployed):"
echo "   https://chatnalyxer-whatsapp.onrender.com"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 Auto-updating mobile config..."

# Auto-update mobile config
cat > chatnalyxer-mobile/src/config.ts << EOF
// HTTPS Tunnel for Mobile Testing
const TUNNEL_URL = "$TUNNEL_URL";

export const BASE_URL = TUNNEL_URL;

// For local direct (only if same WiFi):
// const LOCAL_IP = "http://10.71.39.32:8000";
EOF

echo "✅ Mobile config updated!"
echo ""

# Update WhatsApp integration config to use localhost
cat > whatsapp-integration/config.js << EOF
export const BASE_URL = "http://localhost:8000";
export const API_KEY = "b6323763d2e0a563df26d3ff6392db8f3d82bfd05207f231874d6474cbc376d4";
EOF

echo "✅ WhatsApp integration config updated to use localhost!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Rebuild your mobile app:"
echo "   cd chatnalyxer-mobile"
echo "   npx expo start"
echo ""
echo "2. Test from your phone using Expo Go"
echo ""
echo "3. Backend is running on: http://localhost:8000"
echo "4. Mobile app connects via: $TUNNEL_URL"
echo "5. WhatsApp integration connects to: http://localhost:8000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 ngrok Web Interface: http://localhost:4040"
echo ""
echo "⚠️  Press Ctrl+C to stop the tunnel"
echo ""

# Trap Ctrl+C to cleanup
trap 'echo ""; echo "🛑 Stopping tunnel..."; pkill -f ngrok; exit 0' INT

# Keep script running
wait $NGROK_PID
