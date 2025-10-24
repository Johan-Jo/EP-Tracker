# Apply the membership RLS fix migration

Write-Host "Applying Membership RLS Fix..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$migrationFile = Join-Path -Path $projectRoot -ChildPath "supabase\migrations\20241024000002_fix_membership_rls_v2.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Migration file found" -ForegroundColor Green
Write-Host ""

Write-Host "OPTION 1: Using Supabase CLI (Recommended)" -ForegroundColor Green
Write-Host "Run this command:" -ForegroundColor Cyan
Write-Host "  npx supabase db push" -ForegroundColor White
Write-Host ""

Write-Host "OPTION 2: Manual Application via Supabase Dashboard" -ForegroundColor Green
Write-Host ""
Write-Host "1. Go to: https://supabase.com/dashboard/project/_/sql/new" -ForegroundColor Cyan
Write-Host "2. Copy and paste the SQL below" -ForegroundColor Cyan
Write-Host "3. Click 'Run'" -ForegroundColor Cyan
Write-Host ""

Write-Host "Migration SQL:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor DarkGray
$sql = Get-Content $migrationFile -Raw
Write-Host $sql -ForegroundColor White
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host ""

Write-Host "This migration will:" -ForegroundColor Cyan
Write-Host "  1. Drop all existing membership policies" -ForegroundColor White
Write-Host "  2. Create 'read own memberships' policy FIRST" -ForegroundColor White
Write-Host "  3. Create 'read org memberships' for admin features" -ForegroundColor White
Write-Host "  4. Recreate admin management policies" -ForegroundColor White
Write-Host ""

Write-Host "Ready to apply! Choose your preferred method above." -ForegroundColor Green
