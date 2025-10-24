# Fix Kuk-Rune's role from foreman to worker
# This script connects to your Supabase database and updates the role

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Fix Kuk-Rune Role: Foreman -> Worker" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if SQL file exists
if (-not (Test-Path "scripts\fix-kuk-rune-role.sql")) {
    Write-Host "Error: SQL file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Show Kuk-Rune's current role (foreman)" -ForegroundColor White
Write-Host "  2. Update role to 'worker'" -ForegroundColor White
Write-Host "  3. Verify the change" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Opening Supabase SQL Editor..." -ForegroundColor Green
Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Cyan
Write-Host "  1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new" -ForegroundColor White
Write-Host "  2. Copy the SQL from: scripts\fix-kuk-rune-role.sql" -ForegroundColor White
Write-Host "  3. Paste it into the SQL Editor" -ForegroundColor White
Write-Host "  4. Click 'Run' to execute" -ForegroundColor White
Write-Host "  5. Verify the output shows role changed to 'worker'" -ForegroundColor White
Write-Host ""
Write-Host "SQL file location: $(Resolve-Path 'scripts\fix-kuk-rune-role.sql')" -ForegroundColor Green
Write-Host ""

# Copy SQL to clipboard
Get-Content "scripts\fix-kuk-rune-role.sql" | Set-Clipboard
Write-Host "✓ SQL copied to clipboard!" -ForegroundColor Green
Write-Host ""

# Open Supabase dashboard
$projectUrl = "https://supabase.com/dashboard"
Write-Host "Opening Supabase dashboard..." -ForegroundColor Yellow
Start-Process $projectUrl

Write-Host ""
Write-Host "After running the SQL:" -ForegroundColor Cyan
Write-Host "  1. Have Kuk-Rune log out and log back in" -ForegroundColor White
Write-Host "  2. He should NO LONGER see 'Hantera team' button" -ForegroundColor White
Write-Host "  3. He should only see projects he's assigned to" -ForegroundColor White
Write-Host ""
Write-Host "Done! Press any key to exit..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

