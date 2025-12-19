#!/bin/bash

# Kill any existing node process running the service
# Ensure port 3001 is free
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
pkill -f "node otp-service.js" || true

# Kill any Chrome instances that might be stuck (be careful to target only ours if possible, 
# but generally headless chromes spawned by node are what we want)
# We can't easily distinguish, so we'll rely on deleting the lock file which is safer.

echo "🧹 Cleaning up WhatsApp Session..."
# Force remove the session directory to clear the SingletonLock
rm -rf ~/.wwebjs-sessions-otp

echo "✅ Cleanup complete."
echo "🚀 Starting OTP Service..."
node otp-service.js
