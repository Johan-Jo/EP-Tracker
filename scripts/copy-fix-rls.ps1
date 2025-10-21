$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$sqlFile = Join-Path $scriptDir "fix-rls-policies-complete.sql"

if (Test-Path $sqlFile) {
    Get-Content $sqlFile | Set-Clipboard
    Write-Host "✅ RLS Policy Fix copied to clipboard!" -ForegroundColor Green
    Write-Host ""
    Write-Host "This will:" -ForegroundColor Cyan
    Write-Host "  1. ✅ Remove recursive policies causing infinite loop"
    Write-Host "  2. ✅ Add super admin bypass (full access)"
    Write-Host "  3. ✅ Keep user access to their own memberships"
    Write-Host "  4. ✅ Allow users to see others in their org"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to Supabase Dashboard → SQL Editor"
    Write-Host "  2. Click 'New Query'"
    Write-Host "  3. Press Ctrl+V to paste"
    Write-Host "  4. Click 'Run' ▶️"
    Write-Host ""
    Write-Host "This fixes the 'infinite recursion' error!" -ForegroundColor Green
} else {
    Write-Error "File not found: $sqlFile"
    exit 1
}

