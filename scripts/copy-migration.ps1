# Copy Migration to Clipboard
# Usage: .\scripts\copy-migration.ps1 1  (for schema)
#        .\scripts\copy-migration.ps1 2  (for seed data)

param([int]$MigrationNumber = 1)

$schema = "supabase\migrations\20241020000009_super_admin_billing_schema_safe.sql"
$seed = "supabase\migrations\20241021000000_pricing_plans_seed.sql"

if ($MigrationNumber -eq 1) {
    Write-Host "`n📋 Copying SCHEMA migration to clipboard..." -ForegroundColor Cyan
    Get-Content $schema | Set-Clipboard
    Write-Host "✅ Copied! Now:" -ForegroundColor Green
    Write-Host "   1. Go to Supabase Dashboard → SQL Editor" -ForegroundColor Yellow
    Write-Host "   2. Click 'New Query'" -ForegroundColor Yellow
    Write-Host "   3. Press Ctrl+V to paste" -ForegroundColor Yellow
    Write-Host "   4. Click 'Run' ▶️`n" -ForegroundColor Yellow
} elseif ($MigrationNumber -eq 2) {
    Write-Host "`n📋 Copying SEED DATA migration to clipboard..." -ForegroundColor Cyan
    Get-Content $seed | Set-Clipboard
    Write-Host "✅ Copied! Now:" -ForegroundColor Green
    Write-Host "   1. In Supabase SQL Editor, click 'New Query'" -ForegroundColor Yellow
    Write-Host "   2. Press Ctrl+V to paste" -ForegroundColor Yellow
    Write-Host "   3. Click 'Run' ▶️`n" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Invalid migration number. Use 1 or 2." -ForegroundColor Red
}

