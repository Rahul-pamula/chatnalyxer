#!/bin/bash

echo "🛑 Stopping all Chatnalyxer services..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

# Kill by PID files if they exist
if [ -f ".pids/backend.pid" ]; then
    kill $(cat .pids/backend.pid) 2>/dev/null && print_status "Stopped backend" || echo "Backend already stopped"
    rm .pids/backend.pid
fi

if [ -f ".pids/otp.pid" ]; then
    kill $(cat .pids/otp.pid) 2>/dev/null && print_status "Stopped OTP service" || echo "OTP service already stopped"
    rm .pids/otp.pid
fi

if [ -f ".pids/mobile.pid" ]; then
    kill $(cat .pids/mobile.pid) 2>/dev/null && print_status "Stopped mobile app" || echo "Mobile app already stopped"
    rm .pids/mobile.pid
fi

# Fallback: kill by port
lsof -ti:8000 | xargs kill -9 2>/dev/null && print_status "Killed processes on port 8000"
lsof -ti:3001 | xargs kill -9 2>/dev/null && print_status "Killed processes on port 3001"
lsof -ti:8081 | xargs kill -9 2>/dev/null && print_status "Killed processes on port 8081"

# Kill by process name
pkill -f "uvicorn app.main:app" 2>/dev/null && print_status "Killed uvicorn processes"
pkill -f "node otp-service.js" 2>/dev/null && print_status "Killed OTP service processes"
pkill -f "expo start" 2>/dev/null && print_status "Killed Expo processes"

echo ""
echo "✅ All services stopped"
