#!/bin/bash

echo "Starting deployment script..."
echo "Current directory: $(pwd)"
ls -la

# Try explicit absolute path first (Azure Standard)
if [ -d "/home/site/wwwroot/chatnalyxer-backend" ]; then
    echo "Found backend at /home/site/wwwroot/chatnalyxer-backend"
    cd /home/site/wwwroot/chatnalyxer-backend
elif [ -d "chatnalyxer-backend" ]; then
    echo "Found backend at ./chatnalyxer-backend"
    cd chatnalyxer-backend
else
    echo "ERROR: Could not find chatnalyxer-backend directory in $(pwd)"
    exit 1
fi

echo "Installing specific dependencies if needed..."
# pip install -r requirements.txt 

echo "Starting Uvicorn..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
