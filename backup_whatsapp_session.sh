#!/bin/bash

# WhatsApp Session Backup Script
# Backs up the WhatsApp session to allow easy restoration on a deployed server

SESSION_DIR="$HOME/.wwebjs-sessions-otp"
BACKUP_NAME="whatsapp-session-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

echo "📦 Backing up WhatsApp session..."

if [ ! -d "$SESSION_DIR" ]; then
    echo "❌ Error: Session directory not found at $SESSION_DIR"
    echo "   Make sure you've authenticated WhatsApp at least once."
    exit 1
fi

# Create backup
tar -czf "$BACKUP_NAME" -C "$HOME" .wwebjs-sessions-otp

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_NAME" | cut -f1)
    echo "✅ Backup created successfully!"
    echo "   File: $BACKUP_NAME"
    echo "   Size: $SIZE"
    echo ""
    echo "📤 To restore on server:"
    echo "   1. Upload this file to your server"
    echo "   2. Run: tar -xzf $BACKUP_NAME -C ~/"
    echo "   3. Start the WhatsApp service"
else
    echo "❌ Backup failed!"
    exit 1
fi
