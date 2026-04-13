@echo off
echo ================================================
echo   FinanceHQ - Personal Finance Dashboard
echo ================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python ist nicht installiert. Bitte installiere Python 3.10+
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js ist nicht installiert. Bitte installiere Node.js 18+
    pause
    exit /b 1
)

:: Install Backend Dependencies
echo [1/4] Installiere Backend-Abhängigkeiten...
cd backend
pip install -r requirements.txt -q
cd ..

:: Install Frontend Dependencies
echo [2/4] Installiere Frontend-Abhängigkeiten...
cd frontend
call npm install --silent
cd ..

:: Start Backend
echo [3/4] Starte Backend (Port 8000)...
cd backend
start /B python main.py
cd ..

:: Wait for backend
timeout /t 3 /nobreak >nul

:: Start Frontend
echo [4/4] Starte Frontend (Port 3000)...
cd frontend
call npm run dev

pause
