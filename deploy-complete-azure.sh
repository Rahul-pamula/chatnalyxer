#!/bin/bash

# Complete Chatnalyxer Azure Deployment
# Deploys: Backend + WhatsApp Service (using Supabase DB)

set -e

echo "🚀 Complete Chatnalyxer Azure Deployment"
echo "========================================="
echo ""

# Configuration
RG="chatnalyxer-rg"
LOCATION="southeastasia"
TIMESTAMP=$(date +%s)
BACKEND_APP="chatnalyxer-backend-$TIMESTAMP"
WHATSAPP_APP="chatnalyxer-whatsapp-$TIMESTAMP"
PLAN="chatnalyxer-plan"

# Collect information
echo "📝 Configuration Setup"
echo "======================"
echo ""
read -p "Enter your Supabase DATABASE_URL: " SUPABASE_URL
read -p "Enter your Gemini API Key: " GEMINI_KEY

# Auto-generate WhatsApp API key
WHATSAPP_KEY=$(openssl rand -hex 32)
echo ""
echo "✅ Auto-generated WhatsApp API Key: $WHATSAPP_KEY"
echo "   (Save this - you'll need it for mobile app config)"

echo ""
echo "📋 Deployment Configuration:"
echo "  Resource Group: $RG"
echo "  Location: Southeast Asia"
echo "  Backend App: $BACKEND_APP"
echo "  WhatsApp App: $WHATSAPP_APP"
echo "  Database: Supabase (external)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "🔧 Step 1/5: Creating Resource Group..."
az group create \
  --name $RG \
  --location $LOCATION \
  --output table

echo ""
echo "🔧 Step 2/5: Creating App Service Plan (B1 - shared)..."
az appservice plan create \
  --name $PLAN \
  --resource-group $RG \
  --sku B1 \
  --is-linux \
  --output table

echo ""
echo "🔧 Step 3/5: Creating Backend Web App (Python 3.11)..."
az webapp create \
  --resource-group $RG \
  --plan $PLAN \
  --name $BACKEND_APP \
  --runtime "PYTHON:3.11" \
  --output table

echo ""
echo "🔧 Step 4/5: Creating WhatsApp Web App (Node.js 18)..."
az webapp create \
  --resource-group $RG \
  --plan $PLAN \
  --name $WHATSAPP_APP \
  --runtime "NODE:18-lts" \
  --output table

echo ""
echo "🔧 Step 5/5: Configuring Environment Variables..."

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
  --output table

echo ""
echo "✅ Azure Resources Created Successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 SAVE THESE URLs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Backend API:"
echo "   https://$BACKEND_APP.azurewebsites.net"
echo ""
echo "📱 WhatsApp Service:"
echo "   https://$WHATSAPP_APP.azurewebsites.net"
echo ""
echo "📚 API Documentation:"
echo "   https://$BACKEND_APP.azurewebsites.net/docs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Deploy Backend Code:"
echo "   cd /Users/pamula/Desktop/chatnalyxer/chatnalyxer-backend"
echo "   zip -r deploy.zip . -x '*.git*' -x '*venv*' -x '*__pycache__*'"
echo "   az webapp deployment source config-zip \\"
echo "     --resource-group $RG \\"
echo "     --name $BACKEND_APP \\"
echo "     --src deploy.zip"
echo ""
echo "2️⃣  Deploy WhatsApp Service:"
echo "   cd /Users/pamula/Desktop/chatnalyxer/whatsapp-integration"
echo "   zip -r deploy.zip . -x '*.git*' -x '*node_modules*'"
echo "   az webapp deployment source config-zip \\"
echo "     --resource-group $RG \\"
echo "     --name $WHATSAPP_APP \\"
echo "     --src deploy.zip"
echo ""
echo "3️⃣  Update Mobile App Config:"
echo "   Edit: chatnalyxer-mobile/src/config.ts"
echo "   Change BASE_URL to: https://$BACKEND_APP.azurewebsites.net"
echo ""
echo "4️⃣  Build Android APK:"
echo "   cd /Users/pamula/Desktop/chatnalyxer/chatnalyxer-mobile"
echo "   eas build --platform android --profile production"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💰 Monthly Cost: ~$13 (App Service only)"
echo "🎓 Your $100 credits = 7+ months FREE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
