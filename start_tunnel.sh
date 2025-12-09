#!/bin/bash

# Tunnel Setup Script for Chatnalyxer
# This script sets up ngrok tunnels for backend and WhatsApp integration

echo "🚀 Starting Chatnalyxer with ngrok tunnels..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Install it from https://ngrok.com/download"
    exit 1
fi

# Kill any existing ngrok processes
pkill -f ngrok

# Start ngrok for backend (port 8000)
echo "📡 Starting ngrok tunnel for backend (port 8000)..."
ngrok http 8000 --log=stdout > /tmp/ngrok-backend.log &
NGROK_BACKEND_PID=$!

# Wait for ngrok to start
sleep 3

# Get the public URL
BACKEND_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Failed to get ngrok URL. Check if ngrok is running."
    exit 1
fi

echo ""
echo "✅ Backend tunnel active!"
echo "📍 Public URL: $BACKEND_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 UPDATE YOUR MOBILE APP CONFIG:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Edit: chatnalyxer-mobile/src/config.ts"
echo ""
echo "Change BASE_URL to:"
echo "export const BASE_URL = \"$BACKEND_URL\";"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 ngrok Web Interface: http://localhost:4040"
echo ""
echo "Press Ctrl+C to stop all tunnels"
echo ""

# Keep script running
wait $NGROK_BACKEND_PID
