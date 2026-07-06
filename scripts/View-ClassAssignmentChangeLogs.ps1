# View ClassAssignmentChangeLogs in Firebird (PORTAL.FDB)
param(
    [string]$ClassId = "",
    [int]$Limit = 50,
    [switch]$Create,
    [switch]$MigrateFromSqlite
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Push-Location (Join-Path $root "scripts\FdbUdfUpdate")
try {
    if ($Create) {
        Write-Host "Creating ClassAssignmentChangeLogs in Firebird..." -ForegroundColor Cyan
        dotnet run -v q -- --create-assign-log
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host ""
    }

    if ($MigrateFromSqlite) {
        Write-Host "Migrating rows from SQLite to Firebird..." -ForegroundColor Cyan
        dotnet run -v q -- --migrate-assign-log-from-sqlite
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host ""
    }

    Write-Host "ClassAssignmentChangeLogs (Firebird)" -ForegroundColor Cyan
    $runArgs = @("run", "-v", "q", "--", "--view-assign-log")
    if ($ClassId) { $runArgs += @("--class-id", $ClassId) }
    if ($Limit -ne 50) { $runArgs += @("--limit", "$Limit") }
    dotnet @runArgs
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
