#!/bin/bash
# Navigate to the backend folder
cd chatnalyxer-backend
# Run the application
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
