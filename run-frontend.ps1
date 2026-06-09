# Run frontend dev server (refreshes PATH so npm works in older terminals)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path "$root\.env") -and (Test-Path "$root\.env.example")) {
    Copy-Item "$root\.env.example" "$root\.env"
    Write-Host "Created .env from .env.example — edit Billplz keys before paying online." -ForegroundColor Yellow
}

Set-Location "$root\frontend"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm not found. Install Node.js LTS from https://nodejs.org" -ForegroundColor Red
    Write-Host "Then close and reopen your terminal, or run: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Running npm install..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Starting frontend at http://localhost:5173" -ForegroundColor Green
npm run dev
