#!/bin/bash

# Chatnalyxer Azure Deployment - Using Supabase Database
# Only deploys the FastAPI backend to Azure App Service

set -e  # Exit on error

echo "🚀 Chatnalyxer Azure Deployment (with Supabase)"
echo "================================================"
echo ""

# Configuration
RG="chatnalyxer-rg"
LOCATION="southeastasia"
BACKEND_APP="chatnalyxer-backend-$(date +%s)"  # Unique name
PLAN="chatnalyxer-plan"

# Prompt for Supabase connection string
echo "📝 Get your Supabase connection string from:"
echo "   https://app.supabase.com → Your Project → Settings → Database"
echo ""
read -p "Enter your Supabase DATABASE_URL: " SUPABASE_URL

# Prompt for API keys
read -p "Enter your Gemini API Key: " GEMINI_KEY
read -p "Enter your WhatsApp API Key: " WHATSAPP_KEY

echo ""
echo "📋 Configuration:"
echo "  Resource Group: $RG"
echo "  Location: $LOCATION (Southeast Asia)"
echo "  Backend App: $BACKEND_APP"
echo "  Database: Supabase (external)"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

echo ""
echo "Step 1/3: Creating Resource Group..."
az group create --name $RG --location $LOCATION --output table

echo ""
echo "Step 2/3: Creating App Service Plan..."
az appservice plan create \
  --name $PLAN \
  --resource-group $RG \
  --sku B1 \
  --is-linux \
  --output table

echo ""
echo "Step 3/3: Creating Web App..."
az webapp create \
  --resource-group $RG \
  --plan $PLAN \
  --name $BACKEND_APP \
  --runtime "PYTHON:3.11" \
  --output table

echo ""
echo "Configuring environment variables..."
az webapp config appsettings set \
  --resource-group $RG \
  --name $BACKEND_APP \
  --settings \
    DATABASE_URL="$SUPABASE_URL" \
    SECRET_KEY="$(openssl rand -hex 32)" \
    GEMINI_API_KEY="$GEMINI_KEY" \
    WHATSAPP_API_KEY="$WHATSAPP_KEY" \
  --output table

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📝 Important Information:"
echo "========================="
echo "Backend URL: https://$BACKEND_APP.azurewebsites.net"
echo "Database: Supabase (your existing database)"
echo ""
echo "Next Steps:"
echo "1. Deploy your code:"
echo "   cd /Users/pamula/Desktop/chatnalyxer/chatnalyxer-backend"
echo "   zip -r deploy.zip . -x '*.git*' -x '*venv*' -x '*__pycache__*'"
echo "   az webapp deployment source config-zip --resource-group $RG --name $BACKEND_APP --src deploy.zip"
echo ""
echo "2. Update mobile app config:"
echo "   Edit: chatnalyxer-mobile/src/config.ts"
echo "   Change BASE_URL to: https://$BACKEND_APP.azurewebsites.net"
echo ""
echo "3. Build APK:"
echo "   cd /Users/pamula/Desktop/chatnalyxer/chatnalyxer-mobile"
echo "   eas build --platform android --profile production"
echo ""
echo "💰 Cost: ~$13/month (App Service only - Supabase is FREE!)"
echo ""
