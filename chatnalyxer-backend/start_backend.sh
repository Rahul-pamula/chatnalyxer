#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Run uvicorn with the venv's Python
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --reload
