# Delete user johan@estimatepro.se from Supabase
# This script copies the SQL to your clipboard

$sql = Get-Content "scripts/delete-user.sql" -Raw

Set-Clipboard -Value $sql

Write-Host ""
Write-Host "✅ SQL har kopierats till clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Nästa steg:" -ForegroundColor Cyan
Write-Host "1. Gå till Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Välj ditt EP-Tracker projekt" -ForegroundColor White
Write-Host "3. Gå till SQL Editor (i vänstermenyn)" -ForegroundColor White
Write-Host "4. Klicka på 'New query'" -ForegroundColor White
Write-Host "5. Tryck Ctrl+V för att klistra in SQL:en" -ForegroundColor White
Write-Host "6. Klicka 'Run' (eller tryck Ctrl+Enter)" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Detta kommer att radera användaren johan@estimatepro.se och ALL relaterad data!" -ForegroundColor Yellow
Write-Host ""

