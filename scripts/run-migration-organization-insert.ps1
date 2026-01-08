# Script to run the organization INSERT policy migration
# This fixes the "Kunde inte skapa organisation" error during signup

Write-Host "Running migration: fix_organization_insert_policy.sql" -ForegroundColor Green

# Check if Supabase CLI is available
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Supabase CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install it from: https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor Yellow
    exit 1
}

# Try to push migration
Write-Host "Attempting to push migration to remote database..." -ForegroundColor Yellow

# Option 1: If project is linked, use db push
$pushResult = supabase db push 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration applied successfully!" -ForegroundColor Green
    exit 0
}

# Option 2: If not linked, provide instructions
Write-Host "`nProject is not linked to Supabase. Please do one of the following:" -ForegroundColor Yellow
Write-Host "`nOption 1: Link the project first:" -ForegroundColor Cyan
Write-Host "  1. Run: supabase login" -ForegroundColor White
Write-Host "  2. Run: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor White
Write-Host "  3. Run: supabase db push" -ForegroundColor White

Write-Host "`nOption 2: Run SQL directly in Supabase Dashboard:" -ForegroundColor Cyan
Write-Host "  1. Go to Supabase Dashboard -> SQL Editor" -ForegroundColor White
Write-Host "  2. Copy the contents of: supabase/migrations/20250207000001_fix_organization_insert_policy.sql" -ForegroundColor White
Write-Host "  3. Paste and run the SQL" -ForegroundColor White

Write-Host "`nThe migration file is located at:" -ForegroundColor Yellow
Write-Host "  supabase/migrations/20250207000001_fix_organization_insert_policy.sql" -ForegroundColor White

exit 1
