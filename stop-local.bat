@echo off
echo Stopping VidFlow services...

taskkill /FI "WindowTitle eq VidFlow Backend*" /T /F >nul 2>nul
taskkill /FI "WindowTitle eq VidFlow Frontend*" /T /F >nul 2>nul

REM Alternative: Kill by port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul

echo All services stopped.
pause
