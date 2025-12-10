#!/bin/bash

echo "🔧 Chatnalyxer - Fix and Start Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Step 1: Kill existing processes
echo "Step 1: Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null && print_status "Killed processes on port 8000" || print_warning "No processes on port 8000"
lsof -ti:3001 | xargs kill -9 2>/dev/null && print_status "Killed processes on port 3001" || print_warning "No processes on port 3001"
lsof -ti:8081 | xargs kill -9 2>/dev/null && print_status "Killed processes on port 8081" || print_warning "No processes on port 8081"
pkill -f "node otp-service.js" 2>/dev/null && print_status "Killed OTP service processes" || print_warning "No OTP service processes"
pkill -f "node index.js" 2>/dev/null && print_status "Killed WhatsApp integration processes" || print_warning "No WhatsApp integration processes"
echo ""

# Step 2: Clean up session locks
echo "Step 2: Cleaning up WhatsApp session locks..."
rm -rf ~/.wwebjs-sessions-otp 2>/dev/null && print_status "Cleaned OTP session directory" || print_warning "No OTP session directory"
rm -rf ~/auth_info_baileys_* 2>/dev/null && print_status "Cleaned Baileys auth directories" || print_warning "No Baileys auth directories"
echo ""

# Step 3: Verify dependencies
echo "Step 3: Verifying dependencies..."

# Check Python dependencies
cd chatnalyxer-backend
if [ ! -d "venv" ]; then
    print_warning "Virtual environment not found. Creating..."
    python3 -m venv venv
fi
source venv/bin/activate
print_status "Activated Python virtual environment"

# Check if requirements are installed
pip list | grep -q "fastapi" || {
    print_warning "Installing Python dependencies..."
    pip install -r requirements.txt -q
}
print_status "Python dependencies verified"

cd ..

# Check Node dependencies
cd whatsapp-integration
if [ ! -d "node_modules" ]; then
    print_warning "Node modules not found. Installing..."
    npm install -q
fi
print_status "Node dependencies verified"

cd ..

# Check mobile app dependencies
cd chatnalyxer-mobile
if [ ! -d "node_modules" ]; then
    print_warning "Mobile app dependencies not found. Installing..."
    npm install -q
fi
print_status "Mobile app dependencies verified"

cd ..
echo ""

# Step 4: Start services
echo "Step 4: Starting services..."
echo ""

# Start backend
echo "Starting Backend API (port 8000)..."
cd chatnalyxer-backend
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
sleep 2
if ps -p $BACKEND_PID > /dev/null; then
    print_status "Backend API started (PID: $BACKEND_PID)"
else
    print_error "Backend API failed to start. Check logs/backend.log"
fi
cd ..
echo ""

# Start WhatsApp OTP Service
echo "Starting WhatsApp OTP Service (port 3001)..."
mkdir -p logs
cd whatsapp-integration
nohup node otp-service.js > ../logs/otp-service.log 2>&1 &
OTP_PID=$!
sleep 2
if ps -p $OTP_PID > /dev/null; then
    print_status "OTP Service started (PID: $OTP_PID)"
else
    print_error "OTP Service failed to start. Check logs/otp-service.log"
fi
cd ..
echo ""

# Start Mobile App
echo "Starting Mobile App (port 8081)..."
cd chatnalyxer-mobile
nohup npm start > ../logs/mobile.log 2>&1 &
MOBILE_PID=$!
sleep 3
if ps -p $MOBILE_PID > /dev/null; then
    print_status "Mobile App started (PID: $MOBILE_PID)"
else
    print_error "Mobile App failed to start. Check logs/mobile.log"
fi
cd ..
echo ""

# Step 5: Display status
echo "======================================"
echo "🎉 Startup Complete!"
echo "======================================"
echo ""
echo "📊 Service Status:"
echo "  • Backend API:     http://localhost:8000"
echo "  • OTP Service:     http://localhost:3001"
echo "  • Mobile App:      http://localhost:8081"
echo ""
echo "📝 Process IDs:"
echo "  • Backend:  $BACKEND_PID"
echo "  • OTP:      $OTP_PID"
echo "  • Mobile:   $MOBILE_PID"
echo ""
echo "📋 Next Steps:"
echo "  1. Link WhatsApp: Open http://localhost:3001"
echo "  2. Click 'Link WhatsApp / Refresh QR'"
echo "  3. Scan QR code with WhatsApp"
echo "  4. Test OTP flow in mobile app"
echo ""
echo "📄 Logs are available in the 'logs' directory:"
echo "  • logs/backend.log"
echo "  • logs/otp-service.log"
echo "  • logs/mobile.log"
echo ""
echo "🛑 To stop all services, run: ./stop_all.sh"
echo ""

# Save PIDs for stop script
echo "$BACKEND_PID" > .pids/backend.pid
echo "$OTP_PID" > .pids/otp.pid
echo "$MOBILE_PID" > .pids/mobile.pid
