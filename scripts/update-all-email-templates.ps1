# Update ALL Email Templates - Swedish + Body Content
# Combines Swedish translations and body template functionality

Write-Host "📧 EP Tracker Email Templates Update" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Swedish subject lines
Write-Host "📝 STEG 1: Uppdatera ämnesrader till svenska" -ForegroundColor Yellow
Write-Host ""
$sql1 = Get-Content "supabase/migrations/20241021000005_swedish_email_templates.sql" -Raw
Write-Host "✅ Laddat migration 1/2" -ForegroundColor Green

# Step 2: Add body_template column and content
Write-Host "📝 STEG 2: Lägg till brödtext-funktionalitet" -ForegroundColor Yellow
Write-Host ""
$sql2 = Get-Content "supabase/migrations/20241021000006_add_body_template.sql" -Raw
Write-Host "✅ Laddat migration 2/2" -ForegroundColor Green

# Combine both SQLs
$combinedSql = @"
-- ============================================================================
-- EP Tracker Email Templates: Complete Swedish Update
-- 1. Updates subject lines to Swedish
-- 2. Adds body_template column
-- 3. Populates with Swedish email content
-- ============================================================================

$sql1

-- ============================================================================

$sql2
"@

# Copy to clipboard
Set-Clipboard $combinedSql
Write-Host ""
Write-Host "✅ Kombinerad SQL kopierad till clipboard!" -ForegroundColor Green
Write-Host ""

# Instructions
Write-Host "🚀 Nästa steg:" -ForegroundColor Cyan
Write-Host "1. Gå till Supabase SQL Editor:" -ForegroundColor White
Write-Host "   👉 https://supabase.com/dashboard/project/_/sql" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Klistra in SQL:en (Ctrl+V)" -ForegroundColor White
Write-Host ""
Write-Host "3. Klicka 'Run'" -ForegroundColor White
Write-Host ""
Write-Host "📋 Detta kommer att:" -ForegroundColor Cyan
Write-Host "   ✅ Uppdatera alla ämnesrader till svenska" -ForegroundColor Gray
Write-Host "   ✅ Lägga till kolumn för brödtext" -ForegroundColor Gray
Write-Host "   ✅ Fylla i svensk brödtext för alla 8 mallar" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Efter SQL: Uppdatera sidan i din webbläsare (Ctrl+Shift+R)" -ForegroundColor White
Write-Host ""

