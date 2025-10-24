# Enklare script - Visa instruktioner för manuell uppdatering

Write-Host "=== Fixa Invite Email Template i Supabase ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Problemet: Invite-länkar går till sign-in istället för 'set password'" -ForegroundColor Yellow
Write-Host "Lösning: Uppdatera email template i Supabase Dashboard" -ForegroundColor Green
Write-Host ""

# Try to find project reference from local Supabase config
$projectRef = "DITT-PROJECT-ID"
if (Test-Path ".supabase/config.toml") {
    $configContent = Get-Content ".supabase/config.toml" -Raw
    if ($configContent -match 'project_id\s*=\s*"([^"]+)"') {
        $localProjectId = $matches[1]
        Write-Host "Hittade lokalt project_id: $localProjectId" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "📋 STEG FÖR STEG:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Gå till Supabase Dashboard:" -ForegroundColor White
Write-Host "    https://supabase.com/dashboard" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Välj ditt projekt (EP-Tracker)" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣  Gå till: Authentication → Email Templates" -ForegroundColor White
Write-Host ""

Write-Host "4️⃣  Hitta templaten 'Invite user'" -ForegroundColor White
Write-Host ""

Write-Host "5️⃣  Uppdatera Subject till:" -ForegroundColor White
Write-Host "    Välkommen till EP-Tracker!" -ForegroundColor Cyan
Write-Host ""

Write-Host "6️⃣  VIKTIGT: Se till att template innehåller:" -ForegroundColor White
Write-Host "    {{ .ConfirmationURL }}" -ForegroundColor Yellow
Write-Host ""
Write-Host "    INTE:" -ForegroundColor Red
Write-Host "    {{ .SiteURL }}" -ForegroundColor Red
Write-Host ""

Write-Host "7️⃣  Använd denna template:" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$templateContent = Get-Content "supabase/templates/invite.html" -Raw
Write-Host $templateContent -ForegroundColor Cyan

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "8️⃣  Klicka 'Save'" -ForegroundColor White
Write-Host ""

Write-Host "9️⃣  Verifiera Redirect URLs i: Authentication → URL Configuration" -ForegroundColor White
Write-Host ""
Write-Host "    Lägg till dessa om de saknas:" -ForegroundColor Yellow
Write-Host "    - http://localhost:3000/api/auth/callback" -ForegroundColor Cyan
Write-Host "    - http://localhost:3000/welcome" -ForegroundColor Cyan
Write-Host "    - https://din-production-url/api/auth/callback" -ForegroundColor Cyan
Write-Host "    - https://din-production-url/welcome" -ForegroundColor Cyan
Write-Host ""

Write-Host "🧪 TESTA:" -ForegroundColor Green
Write-Host "1. Bjud in en ny användare från /dashboard/settings/users" -ForegroundColor White
Write-Host "2. Kolla mailet - ska ha 'Acceptera inbjudan och sätt lösenord' knapp" -ForegroundColor White
Write-Host "3. Klicka knappen - ska gå till Supabase 'Update Password' sida" -ForegroundColor White
Write-Host "4. Sätt lösenord - ska redirecta till /welcome" -ForegroundColor White
Write-Host ""

Write-Host "💡 Template är också sparad i: supabase/templates/invite.html" -ForegroundColor Gray
Write-Host ""

# Ask if they want to open the dashboard
$openDashboard = Read-Host "Vill du öppna Supabase Dashboard nu? (y/n)"
if ($openDashboard -eq "y" -or $openDashboard -eq "Y") {
    Start-Process "https://supabase.com/dashboard"
}

Write-Host ""
Write-Host "✅ När du är klar, testa invite-flödet!" -ForegroundColor Green
Write-Host ""
