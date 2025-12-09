#!/bin/bash

# Stop all Chatnalyxer services

echo "🛑 Stopping all Chatnalyxer services..."
echo ""

echo "Stopping backend..."
pkill -f "uvicorn app.main:app"

echo "Stopping mobile app..."
pkill -f "expo start"
pkill -f "npm start"

echo "Stopping WhatsApp integration..."
pkill -f "node.*index.js"
pkill -f "node.*otp-service"

echo "Stopping ngrok tunnels..."
pkill -f "ngrok"

echo "Stopping Cloudflare tunnels..."
pkill -f "cloudflared"

echo "Stopping localtunnel..."
pkill -f "localtunnel"

sleep 2

echo ""
echo "✅ All services stopped"
echo ""
