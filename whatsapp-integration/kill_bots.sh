#!/bin/bash
echo "🔪 Killing all Node.js processes to ensure no zombie bots..."
pkill -f "node index.js" || true
pkill -f "node otp-service.js" || true
echo "✅ All bots killed."
