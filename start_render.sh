#!/bin/bash

# Default to 10000 if PORT is not set (local testing)
PORT=${PORT:-10000}

echo "🚀 Starting Render Service..."
echo "ℹ️  Render assigned PORT: $PORT"
echo "ℹ️  Setting up socat forwarding: 127.0.0.1:8000 -> 127.0.0.1:$PORT"

# Start Python Proxy in background (native python environment compatible)
# Listen on 8000 -> Forward to $PORT
echo "🔗 Starting Python simple proxy..."
cd chatnalyxer-backend && python3 simple_proxy.py &
PROXY_PID=$!

echo "✅ Python proxy started with PID: $PROXY_PID"

# Run Database Migrations
echo "📦 Running Database Migrations..."
# Note: DATABASE_URL should be set in Render env
cd chatnalyxer-backend && python3 migrate_groups_userid.py && cd ..

# Start Uvicorn on the assigned PORT
echo "🔥 Starting Uvicorn on 0.0.0.0:$PORT"
cd chatnalyxer-backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
