# Apply diary activity log trigger fix
# This fixes the "null value in column 'action'" error

Write-Host "Fixing diary_entries activity log trigger..." -ForegroundColor Cyan

# Read the migration file
$migration = Get-Content "supabase\migrations\20250127000006_fix_diary_activity_log_trigger.sql" -Raw

# Copy to clipboard
$migration | Set-Clipboard

Write-Host ""
Write-Host "✓ Migration copied to clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql" -ForegroundColor White
Write-Host "2. Paste the SQL (Ctrl+V)" -ForegroundColor White
Write-Host "3. Click 'Run' to execute" -ForegroundColor White
Write-Host ""
Write-Host "This will update the log_activity() trigger to correctly handle diary_entries." -ForegroundColor Gray







