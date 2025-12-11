#!/bin/bash

# Deploy WhatsApp-Web.js Migration to Render

echo "🚀 Deploying WhatsApp-Web.js migration to Render..."

cd /Users/pamula/Desktop/chatnalyxer

echo "📦 Staging changes..."
git add -A

echo "💾 Committing..."
git commit -m "Fix: Switch to whatsapp-web.js and force dependency reinstall

Changes:
- Migrated user WhatsApp linking from Baileys to whatsapp-web.js
- Created index.cjs (CommonJS) for whatsapp-web.js
- Updated backend to spawn index.cjs instead of index.js
- Bumped package.json version to 2.0.0 (force cache invalidation)
- OTP service unchanged (otp-service.js still uses Baileys)

This fixes MODULE_NOT_FOUND error and uses proven whatsapp-web.js library."

echo "🌐 Pushing to GitHub (will trigger Render deployment)..."
git push origin main

echo "✅ Code pushed! Check Render dashboard for deployment status."
echo ""
echo "📊 Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Watch the deployment logs"
echo "3. Wait for 'Deploy successful'"
echo "4. Test pairing code in mobile app"
