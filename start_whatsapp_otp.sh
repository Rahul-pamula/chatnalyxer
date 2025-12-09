#!/bin/bash

echo "🚀 Starting WhatsApp OTP Service..."

cd whatsapp-integration
npm install
node otp-service.js
