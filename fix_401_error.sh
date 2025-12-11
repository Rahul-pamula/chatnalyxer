#!/bin/bash

# Quick fix script for 401 authentication error
# Run this on your deployed server (Render, etc.)

echo "🔧 WhatsApp OTP Service - 401 Error Fix"
echo "========================================"
echo ""

# Stop the service
echo "Step 1: Stopping OTP service..."
pkill -f "node otp-service.js" 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
echo "✅ Service stopped"
echo ""

# Clear auth folders
echo "Step 2: Clearing authentication data..."

# For production (Render)
if [ -d "/opt/render/.wwebjs-sessions-otp" ]; then
    rm -rf /opt/render/.wwebjs-sessions-otp/baileys_auth_info
    echo "✅ Cleared Render auth folder"
fi

# For local development
if [ -d "$HOME/.wwebjs-sessions-otp" ]; then
    rm -rf $HOME/.wwebjs-sessions-otp
    echo "✅ Cleared local auth folder"
fi

echo ""

# Restart the service
echo "Step 3: Restarting OTP service..."
cd "$(dirname "$0")/whatsapp-integration" || exit 1

# Start in background
nohup node otp-service.js > ../logs/otp-service.log 2>&1 &
OTP_PID=$!

sleep 3

if ps -p $OTP_PID > /dev/null; then
    echo "✅ OTP Service restarted (PID: $OTP_PID)"
else
    echo "❌ Failed to start OTP service. Check logs/otp-service.log"
    exit 1
fi

echo ""
echo "========================================"
echo "🎉 Fix Complete!"
echo "========================================"
echo ""
echo "📋 Next Steps:"
echo "  1. Open your OTP service URL in browser"
echo "  2. Click 'Link WhatsApp / Refresh QR'"
echo "  3. Scan the QR code with WhatsApp"
echo "  4. Wait for '✅ WhatsApp Connected!' message"
echo ""
echo "📄 Logs: tail -f logs/otp-service.log"
echo ""
