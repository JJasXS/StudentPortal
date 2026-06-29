# Run backend API + frontend dev server together (Ctrl+C stops both)
$ErrorActionPreference = "Stop"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$root\scripts\Import-DotEnv.ps1"

if (-not (Test-Path "$root\.env") -and (Test-Path "$root\.env.example")) {
    Copy-Item "$root\.env.example" "$root\.env"
    Write-Host "Created .env from .env.example - edit Billplz keys before paying online." -ForegroundColor Yellow
}

Import-DotEnv -Path "$root\.env"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm not found. Install Node.js LTS from https://nodejs.org" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: dotnet SDK not found." -ForegroundColor Red
    exit 1
}

$provider = $env:DatabaseProvider
if (-not $provider) {
    $devSettingsPath = "$root\backend\MusicTuitionPortal.Api\appsettings.Development.json"
    if (Test-Path $devSettingsPath) {
        $devSettings = Get-Content $devSettingsPath -Raw | ConvertFrom-Json
        $provider = $devSettings.DatabaseProvider
    }
}

if ($provider -eq "Postgres") {
    $pgReady = $false
    try {
        $tcp = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        $pgReady = $tcp.TcpTestSucceeded
    } catch {}

    if (-not $pgReady) {
        Write-Host "ERROR: PostgreSQL is not running on localhost:5432" -ForegroundColor Red
        Write-Host "Start PostgreSQL or set DatabaseProvider=Sqlite in .env" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Using SQLite database (music_tuition_portal.db)" -ForegroundColor Cyan
}

$frontendDir = "$root\frontend"
if (-not (Test-Path "$frontendDir\node_modules")) {
    Write-Host "Running npm install..." -ForegroundColor Cyan
    Push-Location $frontendDir
    npm install
    if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
    Pop-Location
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Music Tuition Portal" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Green
Write-Host "  Swagger:  http://localhost:5000/swagger" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor DarkGray
Write-Host ""

$backendDir = "$root\backend\MusicTuitionPortal.Api"
$backendProc = Start-Process -FilePath "dotnet" -ArgumentList "run" -WorkingDirectory $backendDir -PassThru -NoNewWindow

if ($backendProc.HasExited) {
    Write-Host "ERROR: Backend failed to start." -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

Push-Location $frontendDir
try {
    npm run dev
} finally {
    Pop-Location
    if ($backendProc -and -not $backendProc.HasExited) {
        Write-Host ""
        Write-Host "Stopping backend..." -ForegroundColor Yellow
        Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    }
}
