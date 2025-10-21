$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$sqlFile = Join-Path $scriptDir "discover-and-fix-schema.sql"

if (Test-Path $sqlFile) {
    Get-Content $sqlFile | Set-Clipboard
    Write-Host "✅ SQL copied to clipboard!" -ForegroundColor Green
    Write-Host ""
    Write-Host "This script will:" -ForegroundColor Cyan
    Write-Host "  1. ✅ Discover what tables exist"
    Write-Host "  2. ✅ Create organization_members table if missing"
    Write-Host "  3. ✅ Set up RLS policies"
    Write-Host "  4. ✅ Connect your user (oi@johan.com.br) as admin"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to Supabase Dashboard → SQL Editor"
    Write-Host "  2. Click 'New Query'"
    Write-Host "  3. Press Ctrl+V to paste"
    Write-Host "  4. Click 'Run' ▶️"
    Write-Host ""
    Write-Host "This will fix your schema and connect you to your organization!" -ForegroundColor Green
} else {
    Write-Error "File not found: $sqlFile"
    exit 1
}

