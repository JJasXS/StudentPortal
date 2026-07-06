# Populate UDF_STUDENTNAME, UDF_CLASSDATE (DateTime), UDF_CLASSTIME on SL_SODTL (PORTAL.FDB)
# Migrate INT64 column to TIMESTAMP: dotnet run -v q -- --migrate-classdate
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "Running FDB UDF update..." -ForegroundColor Cyan
Push-Location "$root\scripts\FdbUdfUpdate"
try {
    dotnet run -v q
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
