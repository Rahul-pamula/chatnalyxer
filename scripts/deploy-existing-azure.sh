#!/bin/bash

# Deploy to Existing Azure Resource Group
# Uses your existing chatnalyxer-rg and chatnalyxer-plan

set -e

echo "🚀 Deploy to Existing Azure Resources"
echo "======================================"
echo ""

# Use existing resources
RG="chatnalyxer-rg"
PLAN="chatnalyxer-plan"
TIMESTAMP=$(date +%s)
BACKEND_APP="chatnalyxer-backend-$TIMESTAMP"
WHATSAPP_APP="chatnalyxer-whatsapp-$TIMESTAMP"

# Collect information
echo "📝 Configuration"
echo "================"
echo ""
read -p "Enter your Supabase DATABASE_URL: " SUPABASE_URL
read -p "Enter your Gemini API Key: " GEMINI_KEY

# Auto-generate WhatsApp API key
WHATSAPP_KEY=$(openssl rand -hex 32)
echo ""
echo "✅ Auto-generated WhatsApp API Key: $WHATSAPP_KEY"
echo "   (Save this for mobile app config)"

echo ""
echo "📋 Using Existing Resources:"
echo "  Resource Group: $RG"
echo "  App Service Plan: $PLAN"
echo "  New Backend App: $BACKEND_APP"
echo "  New WhatsApp App: $WHATSAPP_APP"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "🔧 Step 1/3: Creating Backend Web App (Python 3.11)..."
az webapp create \
  --resource-group $RG \
  --plan $PLAN \
  --name $BACKEND_APP \
  --runtime "PYTHON:3.11" \
  --output table

echo ""
echo "🔧 Step 2/3: Creating WhatsApp Web App (Node 20)..."
az webapp create \
  --resource-group $RG \
  --plan $PLAN \
  --name $WHATSAPP_APP \
  --runtime "NODE:20-lts" \
  --output table

echo ""
echo "🔧 Step 3/3: Configuring Environment Variables..."

# Backend environment variables
az webapp config appsettings set \
  --resource-group $RG \
  --name $BACKEND_APP \
  --settings \
    DATABASE_URL="$SUPABASE_URL" \
    SECRET_KEY="$(openssl rand -hex 32)" \
    GEMINI_API_KEY="$GEMINI_KEY" \
    WHATSAPP_API_KEY="$WHATSAPP_KEY" \
  --output table

# WhatsApp service environment variables
BACKEND_URL="https://$BACKEND_APP.azurewebsites.net"
az webapp config appsettings set \
  --resource-group $RG \
  --name $WHATSAPP_APP \
  --settings \
    BACKEND_URL="$BACKEND_URL" \
    WHATSAPP_API_KEY="$WHATSAPP_KEY" \
    PORT="8080" \
  --output table

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 YOUR DEPLOYMENT URLS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Backend API:"
echo "   https://$BACKEND_APP.azurewebsites.net"
echo ""
echo "📱 WhatsApp Service:"
echo "   https://$WHATSAPP_APP.azurewebsites.net"
echo ""
echo "🔑 WhatsApp API Key:"
echo "   $WHATSAPP_KEY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Next: Deploy Your Code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Backend:"
echo "   cd /Users/pamula/Desktop/chatnalyxer/chatnalyxer-backend"
echo "   zip -r deploy.zip . -x '*.git*' -x '*venv*' -x '*__pycache__*'"
echo "   az webapp deployment source config-zip \\"
echo "     --resource-group $RG \\"
echo "     --name $BACKEND_APP \\"
echo "     --src deploy.zip"
echo ""
echo "2️⃣  WhatsApp Service:"
echo "   cd /Users/pamula/Desktop/chatnalyxer/whatsapp-integration"
echo "   zip -r deploy.zip . -x '*.git*' -x '*node_modules*' -x '*auth_info*'"
echo "   az webapp deployment source config-zip \\"
echo "     --resource-group $RG \\"
echo "     --name $WHATSAPP_APP \\"
echo "     --src deploy.zip"
echo ""
echo "3️⃣  Update Mobile App:"
echo "   Edit: chatnalyxer-mobile/src/config.ts"
echo "   Set: BASE_URL = 'https://$BACKEND_APP.azurewebsites.net'"
echo ""
echo "4️⃣  Build APK:"
echo "   cd chatnalyxer-mobile"
echo "   eas build --platform android --profile production"
echo ""
