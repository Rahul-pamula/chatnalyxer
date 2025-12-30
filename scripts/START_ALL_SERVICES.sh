#!/bin/bash

# Chatnalyxer - Complete Startup Guide
# Run each command in a SEPARATE terminal window

echo "🚀 Chatnalyxer Startup Guide"
echo "============================"
echo ""
echo "Open 4 separate terminal windows and run these commands:"
echo ""

echo "📍 Terminal 1 - Backend (Port 8000)"
echo "-----------------------------------"
echo "cd /Users/pamula/Desktop/chatnalyxer/chatnalyxer-backend"
echo "source venv/bin/activate"
echo "uvicorn app.main:app --host 0.0.0.0 --reload"
echo ""

echo "📍 Terminal 2 - Session Manager (Port 3002)"
echo "-------------------------------------------"
echo "cd /Users/pamula/Desktop/chatnalyxer/user-whatsapp-sessions"
echo "node session-manager.js"
echo ""

echo "📍 Terminal 3 - Admin OTP Service (Port 3001)"
echo "---------------------------------------------"
echo "cd /Users/pamula/Desktop/chatnalyxer/admin-whatsapp-otp"
echo "node admin-otp-service.js"
echo ""

echo "📍 Terminal 4 - Mobile App (Port 8081)"
echo "--------------------------------------"
echo "cd /Users/pamula/Desktop/chatnalyxer/chatnalyxer-mobile"
echo "npm start"
echo ""

echo "✅ Once all services are running:"
echo "  - Backend: http://localhost:8000"
echo "  - Session Manager: http://localhost:3002"
echo "  - Admin OTP: http://localhost:3001"
echo "  - Mobile App: http://localhost:8081"
echo ""
echo "🧪 Test with: curl http://localhost:8000/health"
