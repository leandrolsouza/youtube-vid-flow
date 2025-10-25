Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VidFlow - Local Development Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python not found. Please install from https://www.python.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/5] Checking yt-dlp installation..." -ForegroundColor Yellow
$ytdlp = python -m pip show yt-dlp 2>$null
if (-not $ytdlp) {
    Write-Host "[INFO] Installing yt-dlp..." -ForegroundColor Green
    python -m pip install yt-dlp
}

Write-Host "[2/5] Installing backend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host "[3/5] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location ui
if (-not (Test-Path "node_modules")) {
    npm install
}
Set-Location ..

Write-Host "[4/5] Creating downloads directory..." -ForegroundColor Yellow
if (-not (Test-Path "downloads")) {
    New-Item -ItemType Directory -Path "downloads" | Out-Null
}

Write-Host "[5/5] Starting services..." -ForegroundColor Yellow
Write-Host ""

# Start Backend
Write-Host "Starting Backend Server (Port 8081)..." -ForegroundColor Green
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -PassThru -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend Server (Port 3000)..." -ForegroundColor Green
Set-Location ui
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -PassThru -WindowStyle Normal
Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:8081" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to stop all services..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop services
Write-Host ""
Write-Host "Stopping services..." -ForegroundColor Yellow
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue

Write-Host "All services stopped." -ForegroundColor Green
Read-Host "Press Enter to exit"
