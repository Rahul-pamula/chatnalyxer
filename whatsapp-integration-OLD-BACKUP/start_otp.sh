#!/bin/bash

# Start WhatsApp OTP service WITHOUT cleaning session
# Use this for normal restarts to keep WhatsApp linked

# Kill any existing node process running the service
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
pkill -f "node otp-service.js" || true

echo "🚀 Starting OTP Service (preserving WhatsApp session)..."
node otp-service.js
