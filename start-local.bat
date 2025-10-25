@echo off
echo ========================================
echo   VidFlow - Local Development Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python from https://www.python.org/
    pause
    exit /b 1
)

echo [1/5] Checking yt-dlp installation...
python -m pip show yt-dlp >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing yt-dlp...
    python -m pip install yt-dlp
)

echo [2/5] Installing backend dependencies...
if not exist node_modules (
    call npm install
)

echo [3/5] Installing frontend dependencies...
cd ui
if not exist node_modules (
    call npm install
)
cd ..

echo [4/5] Creating downloads directory...
if not exist downloads mkdir downloads

echo [5/5] Starting services...
echo.
echo Starting Backend Server (Port 8081)...
start "VidFlow Backend" cmd /k "npm start"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server (Port 3000)...
cd ui
start "VidFlow Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo   Services Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:8081
echo Frontend: http://localhost:3000
echo.
echo Press any key to stop all services...
pause >nul

taskkill /FI "WindowTitle eq VidFlow Backend*" /T /F >nul 2>nul
taskkill /FI "WindowTitle eq VidFlow Frontend*" /T /F >nul 2>nul

echo.
echo All services stopped.
pause
