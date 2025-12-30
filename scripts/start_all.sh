#!/bin/bash

# Chatnalyxer - Start All Services
# This script starts all required services for the application

echo "🚀 Starting Chatnalyxer Services..."
echo ""

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:8000,3001,3002 | xargs kill -9 2>/dev/null
sleep 2

# Start Backend (Port 8000)
echo "📦 Starting Backend API (Port 8000)..."
cd ../chatnalyxer-backend
source ../venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --reload &
BACKEND_PID=$!
cd ../scripts
sleep 3

# Start Admin Dashboard (Port 3001)
echo "🔐 Starting Admin Dashboard (Port 3001)..."
cd ../admin-whatsapp-otp
node admin-dashboard.js &
ADMIN_PID=$!
cd ../scripts
sleep 2

# Start Session Manager (Port 3002)
echo "📱 Starting WhatsApp Session Manager (Port 3002)..."
cd ../user-whatsapp-sessions
node session-manager.js &
SESSION_PID=$!
cd ../scripts
sleep 2

# Start Mobile App
echo "📱 Starting Mobile App (Expo)..."
cd ../chatnalyxer-mobile
npx expo start &
MOBILE_PID=$!
cd ../scripts
sleep 2

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📊 Service URLs:"
echo "   Backend API:        http://localhost:8000"
echo "   Admin Dashboard:    http://localhost:3001"
echo "   Session Manager:    http://localhost:3002"
echo "   Mobile App:         Expo DevTools will open in browser"
echo ""
echo "🔐 Admin Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📝 Process IDs:"
echo "   Backend:     $BACKEND_PID"
echo "   Admin:       $ADMIN_PID"
echo "   Session Mgr: $SESSION_PID"
echo "   Mobile App:  $MOBILE_PID"
echo ""
echo "📱 Mobile App:"
echo "   - Scan QR code with Expo Go app on your phone"
echo "   - Or press 'a' for Android emulator"
echo "   - Or press 'i' for iOS simulator"
echo ""
echo "To stop all services:"
echo "   lsof -ti:8000,3001,3002 | xargs kill -9"
echo "   pkill -f 'expo start'"
echo ""

# Wait for user interrupt
wait
