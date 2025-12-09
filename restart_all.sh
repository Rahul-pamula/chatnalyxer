#!/bin/bash

# Chatnalyxer Complete Restart Script with HTTPS Tunnels
# This script stops all services and restarts them with ngrok + localtunnel

echo "🛑 Stopping all Chatnalyxer services..."
echo ""

# Kill all running processes
pkill -f "uvicorn app.main:app"
pkill -f "expo start"
pkill -f "npm start"
pkill -f "node.*index.js"
pkill -f "node.*otp-service"
pkill -f "ngrok"
pkill -f "localtunnel"

sleep 3

echo "✅ All services stopped"
echo ""
echo "🚀 Starting services with HTTPS tunnels..."
echo ""

# Start backend
echo "1️⃣ Starting backend..."
cd chatnalyxer-backend
uvicorn app.main:app --host 0.0.0.0 --reload > /tmp/backend.log 2>&1 &
echo "   ✅ Backend started"
sleep 3

# Start WhatsApp integration
echo ""
echo "2️⃣ Starting WhatsApp integration (preserving session)..."
cd ../whatsapp-integration
./start_otp.sh > /tmp/whatsapp.log 2>&1 &
echo "   ✅ WhatsApp integration started (session preserved)"
sleep 2

# Start mobile app
echo ""
echo "3️⃣ Starting mobile app..."
cd ../chatnalyxer-mobile
npm start > /tmp/mobile.log 2>&1 &
echo "   ✅ Mobile app started"
sleep 5

# Start ngrok tunnel for backend
echo ""
echo "4️⃣ Starting ngrok tunnel for backend..."
cd ..
ngrok http 8000 > /tmp/ngrok-backend.log 2>&1 &
sleep 5

# Get ngrok URL
BACKEND_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print([t['public_url'] for t in data.get('tunnels', [])][0] if data.get('tunnels') else 'Starting...')" 2>/dev/null)

if [ ! -z "$BACKEND_URL" ] && [ "$BACKEND_URL" != "Starting..." ]; then
    echo "   ✅ Backend tunnel: $BACKEND_URL"
    
    # Update mobile config
    CONFIG_FILE="chatnalyxer-mobile/src/config.ts"
    sed -i '' "s|const NGROK_TUNNEL_URL = \"https://.*\.ngrok-free\.app\"|const NGROK_TUNNEL_URL = \"$BACKEND_URL\"|g" "$CONFIG_FILE" 2>/dev/null
    echo "   ✅ Mobile config updated"
else
    echo "   ⚠️  Backend tunnel starting..."
    BACKEND_URL="https://xxxxx.ngrok-free.app (check http://localhost:4040)"
fi

# Start Cloudflare Tunnel for mobile app
echo ""
echo "5️⃣ Starting Cloudflare Tunnel for mobile app..."
cloudflared tunnel --url http://localhost:8081 > /tmp/cloudflare-mobile.log 2>&1 &
sleep 5
MOBILE_URL=$(cat /tmp/cloudflare-mobile.log | grep -o "https://.*\.trycloudflare\.com" | head -1)
if [ -z "$MOBILE_URL" ]; then
    MOBILE_URL="https://xxxxx.trycloudflare.com (check logs)"
fi
echo "   ✅ Mobile app tunnel: $MOBILE_URL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL SERVICES STARTED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 HTTPS Access (for University WiFi):"
echo "   Backend API: $BACKEND_URL"
echo "   Mobile App:  $MOBILE_URL"
echo ""
echo "💻 Local Access:"
echo "   Backend: http://localhost:8000"
echo "   Mobile:  http://localhost:8081"
echo ""
echo "🔧 Dashboards:"
echo "   ngrok:  http://localhost:4040"
echo ""
echo "📝 Logs:"
echo "   Backend:   tail -f /tmp/backend.log"
echo "   Mobile:    tail -f /tmp/mobile.log"
echo "   WhatsApp:  tail -f /tmp/whatsapp.log"
echo ""
echo "🛑 To stop all services:"
echo "   ./stop_all.sh"
echo ""
echo "🎉 Ready to test!"
echo ""
