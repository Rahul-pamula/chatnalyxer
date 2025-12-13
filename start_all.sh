#!/bin/bash

echo "🚀 Starting Chatnalyxer with OTP Authentication..."

# Kill existing processes
echo "Stopping existing services..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Start the backend
echo "Starting backend..."
cd chatnalyxer-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --reload &
BACKEND_PID=$!

# Start the frontend
echo "Starting mobile app..."
cd chatnalyxer-mobile
npm install
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ All services started!"
echo ""
echo "📱 Backend API: http://localhost:8000"
echo "📱 Mobile App: http://localhost:8081"
echo ""
echo "📡 OTP Delivery: Native OTP Service (Port 3001)"
echo "   ⚠️  Make sure 'node otp-service.js' is running in your other terminal!"
echo "   (Status: Active)"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait
