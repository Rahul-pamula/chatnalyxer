#!/bin/bash

# Chatnalyxer - Imagine Cup Submission Helper
# This script helps you prepare for submission

echo "🚀 Chatnalyxer - Imagine Cup Submission Helper"
echo "=============================================="
echo ""

# Check time remaining
echo "⏰ Time Check:"
echo "You have approximately 4 hours remaining"
echo "Current time: $(date)"
echo ""

# Phase 1: Video
echo "📹 Phase 1: VIDEO RECORDING (90 mins)"
echo "--------------------------------------"
echo "1. Open QuickTime Player"
echo "2. File → New Screen Recording"
echo "3. Follow VIDEO_RECORDING_GUIDE.md"
echo ""
echo "Press ENTER when video is uploaded to YouTube..."
read

# Get YouTube link
echo "Enter your YouTube video link (unlisted):"
read YOUTUBE_LINK
echo "✅ Video link saved: $YOUTUBE_LINK"
echo ""

# Phase 2: Screenshots
echo "📸 Phase 2: SCREENSHOTS (15 mins)"
echo "----------------------------------"
echo "Take these 5 screenshots and save to ./screenshots/:"
echo "1. setup-screen.png - WhatsApp QR setup"
echo "2. dashboard.png - Dashboard with events"
echo "3. calendar.png - Calendar view"
echo "4. notification.png - Push notification"
echo "5. ai-chat.png - AI chat conversation"
echo ""
echo "Press ENTER when screenshots are ready..."
read

# Check screenshots
SCREENSHOT_COUNT=$(ls -1 screenshots/*.png 2>/dev/null | wc -l)
echo "✅ Found $SCREENSHOT_COUNT screenshots"
echo ""

# Phase 3: Repository
echo "📦 Phase 3: GITHUB REPOSITORY (30 mins)"
echo "----------------------------------------"
echo "Checking repository status..."
echo ""

# Check if repo is clean
if git diff-index --quiet HEAD --; then
    echo "✅ No uncommitted changes"
else
    echo "⚠️  You have uncommitted changes"
    echo "Commit them? (y/n)"
    read COMMIT_CHOICE
    if [ "$COMMIT_CHOICE" = "y" ]; then
        git add .
        git commit -m "Imagine Cup 2026 submission preparation"
        git push origin main
        echo "✅ Changes committed and pushed"
    fi
fi
echo ""

# Phase 4: Submission Checklist
echo "✅ SUBMISSION CHECKLIST"
echo "----------------------"
echo ""
echo "Required Materials:"
echo "[ ] Video URL: $YOUTUBE_LINK"
echo "[ ] GitHub URL: $(git config --get remote.origin.url)"
echo "[ ] Screenshots: $SCREENSHOT_COUNT/5"
echo "[ ] Project description (see IMAGINE_CUP_SUBMISSION.md)"
echo "[ ] Team information"
echo ""

echo "🎯 NEXT STEPS:"
echo "1. Go to: https://imaginecup.microsoft.com/"
echo "2. Click 'Submit >'"
echo "3. Fill in the form with information from IMAGINE_CUP_SUBMISSION.md"
echo "4. Upload screenshots from ./screenshots/"
echo "5. Submit before deadline!"
echo ""

echo "📋 Quick Reference:"
echo "- Video: $YOUTUBE_LINK"
echo "- GitHub: $(git config --get remote.origin.url)"
echo "- Description: See IMAGINE_CUP_SUBMISSION.md"
echo ""

echo "🚀 Good luck with your submission!"
echo "=============================================="
