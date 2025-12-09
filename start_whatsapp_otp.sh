#!/bin/bash

# Optional: Start WhatsApp OTP service separately
# This service requires QR code scan before it can send messages
# Only start this if you want to use real WhatsApp for OTP delivery

echo "🚀 Starting WhatsApp OTP Service..."

cd whatsapp-integration
npm install
node otp-service.js
