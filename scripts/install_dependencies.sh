#!/bin/bash

echo "🚀 Installing Chatnalyxer Dependencies..."
echo ""

# 1. Python Backend
echo "📦 [1/4] Installing Backend Dependencies..."
if [ ! -d "venv" ]; then
    echo "   Creating Python virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
echo "   ✅ Backend dependencies (Python) installed."
echo ""

# 2. Admin Dashboard
echo "🔐 [2/4] Installing Admin Dashboard Dependencies..."
cd admin-whatsapp-otp
npm install
cd ..
echo "   ✅ Admin Dashboard dependencies (Node) installed."
echo ""

# 3. Session Manager
echo "📱 [3/4] Installing Session Manager Dependencies..."
cd user-whatsapp-sessions
npm install
cd ..
echo "   ✅ Session Manager dependencies (Node) installed."
echo ""

# 4. Mobile App
echo "📱 [4/4] Installing Mobile App Dependencies..."
cd chatnalyxer-mobile
npm install
cd ..
echo "   ✅ Mobile App dependencies (Node) installed."
echo ""

echo "✅ All dependencies installed successfully!"
echo "Run 'sh scripts/start_all.sh' to start the project."
