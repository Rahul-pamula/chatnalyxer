#!/bin/bash

# Default to 10000 if PORT is not set (local testing)
PORT=${PORT:-10000}

echo "🚀 Starting Render Service..."
echo "ℹ️  Render assigned PORT: $PORT"
echo "ℹ️  Setting up socat forwarding: 127.0.0.1:8000 -> 127.0.0.1:$PORT"

# Start socat in background
# Listen on 8000 (TCP4-LISTEN:8000)
# Forward to local port $PORT (TCP4:127.0.0.1:$PORT)
# fork: handle multiple connections
# reuseaddr: allow restart binding
socat TCP4-LISTEN:8000,fork,reuseaddr TCP4:127.0.0.1:$PORT &
SOCAT_PID=$!

echo "✅ Socat proxy started with PID: $SOCAT_PID"

# Start Uvicorn on the assigned PORT
echo "🔥 Starting Uvicorn on 0.0.0.0:$PORT"
cd chatnalyxer-backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
