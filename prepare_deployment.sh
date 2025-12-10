#!/bin/bash

# Deployment Preparation Script
# Prepares your code for deployment to Render

echo "🚀 Chatnalyxer Deployment Preparation"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -d "chatnalyxer-backend" ] || [ ! -d "chatnalyxer-mobile" ]; then
    echo "❌ Error: Run this script from the chatnalyxer root directory"
    exit 1
fi

echo "📋 Step 1: Checking Git Setup"
echo "------------------------------"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "⚠️  Git not initialized. Initializing now..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Check for .gitignore
if [ ! -f ".gitignore" ]; then
    echo "⚠️  No .gitignore found. Creating one..."
    cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.venv

# Environment variables
.env
*.env
.env.local

# Database
*.db
*.sqlite
*.sqlite3

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Expo
.expo/
.expo-shared/
dist/
web-build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# WhatsApp session data
auth_info_baileys_*/
.wwebjs-sessions*/

# Temporary files
*.tmp
.pids/

# ngrok
ngrok.yml
EOF
    echo "✅ .gitignore created"
else
    echo "✅ .gitignore exists"
fi

echo ""
echo "📋 Step 2: Checking Required Files"
echo "-----------------------------------"

# Check requirements.txt
if [ -f "chatnalyxer-backend/requirements.txt" ]; then
    echo "✅ requirements.txt exists"
else
    echo "❌ requirements.txt missing!"
    exit 1
fi

# Check package.json for WhatsApp service
if [ -f "whatsapp-integration/package.json" ]; then
    echo "✅ WhatsApp package.json exists"
else
    echo "❌ WhatsApp package.json missing!"
    exit 1
fi

# Check render.yaml
if [ -f "render.yaml" ]; then
    echo "✅ render.yaml exists"
else
    echo "❌ render.yaml missing!"
    exit 1
fi

echo ""
echo "📋 Step 3: Checking for Sensitive Files"
echo "----------------------------------------"

# Check if .env files exist and warn
if [ -f "chatnalyxer-backend/.env" ]; then
    echo "⚠️  Found .env file - will be excluded from git"
    # Ensure it's in .gitignore
    if ! grep -q "\.env" .gitignore; then
        echo ".env" >> .gitignore
        echo "✅ Added .env to .gitignore"
    fi
fi

echo ""
echo "📋 Step 4: Git Status"
echo "---------------------"

# Show current status
git status --short

echo ""
echo "📋 Step 5: Ready to Commit?"
echo "----------------------------"
echo ""
read -p "Do you want to add all files and commit? (y/n): " commit_choice

if [ "$commit_choice" = "y" ]; then
    echo ""
    echo "Adding files..."
    git add .
    
    echo ""
    read -p "Enter commit message (or press Enter for default): " commit_msg
    
    if [ -z "$commit_msg" ]; then
        commit_msg="Prepare for deployment to Render"
    fi
    
    git commit -m "$commit_msg"
    echo "✅ Files committed"
    
    echo ""
    echo "📋 Step 6: GitHub Repository"
    echo "----------------------------"
    echo ""
    echo "Next steps:"
    echo "1. Create a new repository on GitHub: https://github.com/new"
    echo "2. Name it: chatnalyxer"
    echo "3. Don't initialize with README (we already have code)"
    echo ""
    read -p "Have you created the GitHub repository? (y/n): " github_created
    
    if [ "$github_created" = "y" ]; then
        echo ""
        read -p "Enter your GitHub username: " github_user
        
        # Add remote
        git remote add origin "https://github.com/$github_user/chatnalyxer.git" 2>/dev/null || \
        git remote set-url origin "https://github.com/$github_user/chatnalyxer.git"
        
        echo ""
        echo "🚀 Pushing to GitHub..."
        git branch -M main
        git push -u origin main
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ SUCCESS! Code pushed to GitHub"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "📍 Repository: https://github.com/$github_user/chatnalyxer"
            echo ""
            echo "🎯 Next Steps:"
            echo "1. Go to https://render.com"
            echo "2. Sign up with GitHub"
            echo "3. Create new Web Service"
            echo "4. Select your chatnalyxer repository"
            echo "5. Follow DEPLOYMENT_CHECKLIST.md"
            echo ""
            echo "📚 Documentation:"
            echo "- Deployment Plan: DEPLOYMENT_PLAN.md"
            echo "- Checklist: DEPLOYMENT_CHECKLIST.md"
            echo ""
        else
            echo "❌ Push failed. Please check your GitHub credentials"
            echo "You may need to set up a Personal Access Token"
            echo "Visit: https://github.com/settings/tokens"
        fi
    else
        echo ""
        echo "📝 Manual steps:"
        echo "1. Create repository on GitHub"
        echo "2. Run these commands:"
        echo ""
        echo "   git remote add origin https://github.com/YOUR_USERNAME/chatnalyxer.git"
        echo "   git branch -M main"
        echo "   git push -u origin main"
    fi
else
    echo ""
    echo "📝 Manual commit steps:"
    echo "   git add ."
    echo "   git commit -m \"Prepare for deployment\""
    echo "   git push"
fi

echo ""
echo "✅ Preparation complete!"
echo ""
