@echo off
setlocal enabledelayedexpansion

echo 🚀 Installing Chatnalyxer Dependencies (Windows)...
echo.

:: 1. Python Backend
echo 📦 [1/4] Installing Backend Dependencies...
if not exist "..\venv" (
    echo    Creating Python virtual environment...
    python -m venv ..\venv
)
call ..\venv\Scripts\activate
pip install -r ..\requirements.txt
echo    ✅ Backend dependencies installed.
echo.

:: 2. Admin Dashboard
echo 🔐 [2/4] Installing Admin Dashboard Dependencies...
cd ..\admin-whatsapp-otp
call npm install
cd ..\scripts
echo    ✅ Admin Dashboard dependencies installed.
echo.

:: 3. Session Manager
echo 📱 [3/4] Installing Session Manager Dependencies...
cd ..\user-whatsapp-sessions
call npm install
cd ..\scripts
echo    ✅ Session Manager dependencies installed.
echo.

:: 4. Mobile App
echo 📱 [4/4] Installing Mobile App Dependencies...
cd ..\chatnalyxer-mobile
call npm install
cd ..\scripts
echo    ✅ Mobile App dependencies installed.
echo.

echo ✅ All dependencies installed successfully!
echo Run 'scripts\start_all.bat' to start the project.
pause
