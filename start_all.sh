#!/bin/bash

# Start the backend
cd chatnalyxer-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --reload &



# Start the frontend
cd chatnalyxer-mobile
npm install
npm start &
