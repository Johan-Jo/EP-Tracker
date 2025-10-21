# Update Email Templates to Swedish
# Reads the SQL migration file and copies it to clipboard

$sqlFile = "supabase/migrations/20241021000005_swedish_email_templates.sql"

if (Test-Path $sqlFile) {
    $sql = Get-Content $sqlFile -Raw
    Set-Clipboard $sql
    Write-Host "✅ SQL kopierad till clipboard!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Klistra in detta i Supabase SQL Editor:" -ForegroundColor Cyan
    Write-Host "👉 https://supabase.com/dashboard/project/_/sql" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Uppdaterar:" -ForegroundColor White
    Write-Host "  • trial-ending-reminder → 'Din EP Tracker-provperiod slutar om {{daysRemaining}} dagar'" -ForegroundColor Gray
    Write-Host "  • trial-ended → 'Din EP Tracker-provperiod har slutat'" -ForegroundColor Gray
    Write-Host "  • payment-failed → 'Problem med din betalning för EP Tracker'" -ForegroundColor Gray
    Write-Host "  • payment-successful → 'Tack för din betalning till EP Tracker!'" -ForegroundColor Gray
    Write-Host "  • account-suspended → 'Ditt EP Tracker-konto har pausats'" -ForegroundColor Gray
    Write-Host "  • announcement → '{{subject}}'" -ForegroundColor Gray
    Write-Host "  • password-reset → 'Återställ ditt lösenord för EP Tracker'" -ForegroundColor Gray
    Write-Host "  • welcome → 'Välkommen till EP Tracker!'" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Kunde inte hitta $sqlFile" -ForegroundColor Red
}

