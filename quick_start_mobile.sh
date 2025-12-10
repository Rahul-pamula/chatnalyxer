#!/bin/bash

# Quick Start Script for Mobile Testing
# Run this to start everything needed for mobile app testing

echo "🚀 Starting Chatnalyxer Mobile Testing Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start the tunnel
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 1: Starting Mobile Tunnel${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

./start_mobile_tunnel.sh &
TUNNEL_PID=$!

# Wait for tunnel to be ready
sleep 6

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 2: Configuration Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get tunnel URL
TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$TUNNEL_URL" ]; then
    echo -e "✅ Mobile App Tunnel: ${GREEN}$TUNNEL_URL${NC}"
else
    echo -e "⚠️  Tunnel URL not ready yet, check http://localhost:4040"
fi

echo "✅ Backend: http://localhost:8000"
echo "✅ WhatsApp Integration: localhost (connects to backend)"
echo "✅ OTP Service: https://chatnalyxer-whatsapp.onrender.com"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 3: Start Mobile App${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Run in a new terminal:"
echo -e "${YELLOW}cd chatnalyxer-mobile && npx expo start${NC}"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Useful Links${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 ngrok Dashboard: http://localhost:4040"
echo "📚 Backend API Docs: http://localhost:8000/docs"
echo "🔍 Backend Health: http://localhost:8000/health"
echo ""

echo -e "${YELLOW}⚠️  Press Ctrl+C to stop all services${NC}"
echo ""

# Keep running
wait $TUNNEL_PID
