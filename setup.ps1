# Music Tuition Portal - Windows Setup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Music Tuition Portal - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Refresh PATH so newly installed Node.js is visible
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

function Test-Command($name, $command) {
    try {
        $version = Invoke-Expression $command 2>$null
        if ($LASTEXITCODE -eq 0 -or $version) {
            Write-Host "[OK] $name : $version" -ForegroundColor Green
            return $true
        }
    } catch {}
    Write-Host "[MISSING] $name is not installed or not in PATH" -ForegroundColor Yellow
    return $false
}

Test-Command ".NET SDK" "dotnet --version"
Test-Command "Node.js" "node --version"
Test-Command "npm" "npm --version"
Test-Command "Git" "git --version"

Write-Host ""
Write-Host "PostgreSQL reminder:" -ForegroundColor Yellow
Write-Host "  For production use PostgreSQL. For quick local dev, backend uses SQLite by default in Development."
Write-Host "  To use PostgreSQL instead, set DatabaseProvider=Postgres in appsettings.Development.json"
Write-Host ""
Write-Host "Optional winget installs (run manually if needed):" -ForegroundColor DarkGray
Write-Host "  winget install Microsoft.DotNet.SDK.8"
Write-Host "  winget install OpenJS.NodeJS.LTS"
Write-Host "  winget install PostgreSQL.PostgreSQL.17"
Write-Host "  winget install Git.Git"
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path "$root\.env") -and (Test-Path "$root\.env.example")) {
    Copy-Item "$root\.env.example" "$root\.env"
    Write-Host "Created .env from .env.example (single env file for backend + frontend)" -ForegroundColor Green
}

if (Test-Path "$root\frontend\package.json") {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    Push-Location "$root\frontend"
    npm install
    Pop-Location
}

if (Test-Path "$root\backend\MusicTuitionPortal.Api\MusicTuitionPortal.Api.csproj") {
    Write-Host "Restoring backend packages..." -ForegroundColor Cyan
    Push-Location "$root\backend\MusicTuitionPortal.Api"
    dotnet restore
    Pop-Location
}

Write-Host ""
Write-Host "Next steps (from project root):" -ForegroundColor Green
Write-Host "  Both:     .\run.ps1"
Write-Host "  Backend:  .\run-backend.ps1"
Write-Host "  Frontend: .\run-frontend.ps1"
Write-Host ""
Write-Host "Or manually (from project root):" -ForegroundColor Green
Write-Host "  cd backend\MusicTuitionPortal.Api && dotnet run"
Write-Host "  cd frontend && npm run dev"
Write-Host ""
Write-Host "If npm is not recognized, close and reopen your terminal after installing Node.js." -ForegroundColor Yellow
Write-Host "Open http://localhost:5173 and login with admin@demo.com / Admin@123"
Write-Host ""
