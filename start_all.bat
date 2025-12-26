@echo off
setlocal

echo 🚀 Starting Chatnalyxer Services (Windows)...
echo.

:: --- STEP 1: KILL PORTS (Fixes "Port in use" errors) ---
echo 🧹 Cleaning up existing processes...

:: Function to kill process by port
for %%P in (8000 3001 3002) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%P') do (
        if "%%a" NEQ "0" (
            echo    - Killing process on port %%P (PID: %%a)
            taskkill /F /PID %%a >nul 2>&1
        )
    )
)
timeout /t 2 /nobreak >nul

:: --- STEP 2: START BACKEND ---
echo 📦 Starting Backend API (Port 8000)...
start "Chatnalyxer Backend" cmd /k "cd chatnalyxer-backend && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --reload"

:: --- STEP 3: START SESSION MANAGER ---
echo 📱 Starting WhatsApp Session Manager (Port 3002)...
start "WhatsApp Session Manager" cmd /k "cd user-whatsapp-sessions && npm start"

:: --- STEP 4: START ADMIN DASHBOARD ---
echo 🔐 Starting Admin Dashboard (Port 3001)...
start "Admin Dashboard" cmd /k "cd admin-whatsapp-otp && node admin-dashboard.js"

:: --- STEP 5: START MOBILE APP ---
echo 📱 Starting Mobile App (Expo)...
timeout /t 3 /nobreak >nul
start "Chatnalyxer Mobile" cmd /k "cd chatnalyxer-mobile && npx expo start --clear"

echo.
echo ✅ All services launched in new windows!
echo.
echo 📊 Service URLs:
echo    Backend API:        http://localhost:8000
echo    Admin Dashboard:    http://localhost:3001
echo    Session Manager:    http://localhost:3002
echo.
echo ⚠️  Don't close the black Command Prompt windows!
echo    Minimise them to keep the app running.
echo.
pause
