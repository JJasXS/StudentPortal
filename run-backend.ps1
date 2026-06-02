# Run backend API
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend\MusicTuitionPortal.Api"

$devSettings = Get-Content "appsettings.Development.json" -Raw | ConvertFrom-Json
$provider = $devSettings.DatabaseProvider

if ($provider -eq "Postgres") {
    $pgReady = $false
    try {
        $tcp = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        $pgReady = $tcp.TcpTestSucceeded
    } catch {}

    if (-not $pgReady) {
        Write-Host "ERROR: PostgreSQL is not running on localhost:5432" -ForegroundColor Red
        Write-Host "Either start PostgreSQL, or set DatabaseProvider=Sqlite in appsettings.Development.json" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Using SQLite database for development (music_tuition_portal.db)" -ForegroundColor Cyan
}

Write-Host "Starting backend at http://localhost:5000" -ForegroundColor Green
Write-Host "Swagger: http://localhost:5000/swagger" -ForegroundColor Green
dotnet run
