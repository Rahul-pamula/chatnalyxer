#!/bin/bash

# Quick Build Script for Chatnalyxer Mobile App
# This script helps you build a standalone APK

echo "📱 Chatnalyxer Mobile App Builder"
echo "=================================="
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from chatnalyxer-mobile directory"
    echo "Usage: cd chatnalyxer-mobile && ../build_mobile_app.sh"
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 EAS CLI not found. Installing..."
    npm install -g eas-cli
    echo "✅ EAS CLI installed!"
    echo ""
fi

# Check if logged in
echo "🔐 Checking Expo login status..."
if ! eas whoami &> /dev/null; then
    echo "⚠️  Not logged in to Expo"
    echo "Please login with your Expo account:"
    eas login
else
    EXPO_USER=$(eas whoami)
    echo "✅ Logged in as: $EXPO_USER"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Build Options"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Preview Build (APK - Recommended for testing)"
echo "2. Production Build (AAB - For Play Store)"
echo "3. Development Build (With dev tools)"
echo "4. Check Build Status"
echo "5. Exit"
echo ""
read -p "Choose an option (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🔨 Building Preview APK..."
        echo "This will create an APK file you can install on any Android device."
        echo ""
        read -p "⚠️  Have you updated src/config.ts with your production backend URL? (y/n): " confirm
        
        if [ "$confirm" != "y" ]; then
            echo ""
            echo "📝 Please update src/config.ts first:"
            echo "   export const BASE_URL = \"https://your-backend-url.com\";"
            echo ""
            exit 0
        fi
        
        echo ""
        echo "🚀 Starting build... This will take 10-20 minutes."
        eas build --platform android --profile preview
        ;;
    
    2)
        echo ""
        echo "🔨 Building Production AAB..."
        echo "This creates an Android App Bundle for Google Play Store."
        echo ""
        read -p "⚠️  Have you updated the version in app.json? (y/n): " confirm
        
        if [ "$confirm" != "y" ]; then
            echo ""
            echo "📝 Please update version in app.json first"
            exit 0
        fi
        
        echo ""
        echo "🚀 Starting production build..."
        eas build --platform android --profile production
        ;;
    
    3)
        echo ""
        echo "🔨 Building Development Build..."
        echo "This includes development tools and is larger in size."
        echo ""
        eas build --platform android --profile development
        ;;
    
    4)
        echo ""
        echo "📊 Checking build status..."
        echo ""
        eas build:list
        ;;
    
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Build Started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 You can monitor the build at:"
echo "   https://expo.dev"
echo ""
echo "⏱️  Estimated time: 10-20 minutes"
echo ""
echo "📥 Once complete, you'll get a download link for the APK"
echo ""
echo "💡 Tip: Run 'eas build:list' to check status anytime"
echo ""
